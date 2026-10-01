package com.weave.project.service

import com.weave.attachment.service.AttachmentLinker
import com.weave.global.error.ApiException
import com.weave.global.web.PageResponse
import com.weave.project.domain.Project
import com.weave.project.domain.Task
import com.weave.project.dto.CreateProjectRequest
import com.weave.project.dto.CreateProjectResponse
import com.weave.project.dto.ProjectDetailResponse
import com.weave.project.dto.ProjectSummaryResponse
import com.weave.project.dto.UpdateProjectRequest
import com.weave.project.repository.ProjectRepository
import com.weave.project.repository.TaskRepository
import com.weave.schedule.service.OverdueRoller
import com.weave.schedule.service.Replanner
import com.weave.user.service.UserService
import org.springframework.data.domain.PageRequest
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate

@Service
class ProjectService(
    private val projectRepository: ProjectRepository,
    private val taskRepository: TaskRepository,
    private val attachmentLinker: AttachmentLinker,
    private val userService: UserService,
    private val overdueRoller: OverdueRoller,
    private val replanner: Replanner,
    private val clock: Clock,
) {
    /**
     * 등록: 새 프로젝트와 진행중 프로젝트의 미완료 작업을 오늘부터 전부 다시 배치한다(사용자 결정 2026-10-01).
     * 날짜는 임시 일정 알고리즘(Scheduler)이 정한다. 밀린 작업(오늘로 옮긴 추가 작업)과 완료한 작업은 그대로 둔다.
     */
    @Transactional
    fun create(userId: Long, request: CreateProjectRequest): CreateProjectResponse {
        validateTasks(request)
        val user = userService.find(userId)
        overdueRoller.roll(userId)
        val today = LocalDate.now(clock)

        val project = projectRepository.save(Project(userId, request.name.trim(), request.description.trim(), request.deadline, request.color))
        val saved = request.tasks.mapIndexed { i, t ->
            t.key to taskRepository.save(Task(project.id!!, i, t.title.trim(), t.description.trim(), t.estimatedHours, null, 1, null, t.prerequisite))
        }.toMap()
        request.tasks.forEach { t -> t.dependsOnKey?.let { saved.getValue(t.key).dependsOnId = saved.getValue(it).id } }

        val placements = replanner.replan(userId, today, user.dailyAvailableHours, includeDelayed = false)
        attachmentLinker.link(userId, request.attachmentIds, project.id!!)

        val tasks = saved.values.sortedBy { it.position }
        val lateCount = tasks.count { placements[it.id!!]?.late == true }
        return CreateProjectResponse(ProjectDetailResponse.of(project, tasks, attachmentLinker.ofProject(project.id!!)), lateCount)
    }

    @Transactional(readOnly = true)
    fun list(userId: Long, status: String, page: Int, size: Int): PageResponse<ProjectSummaryResponse> {
        if (status != Project.ACTIVE && status != Project.DONE) throw ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "status는 active 또는 done이에요.")
        val result = projectRepository.findPage(userId, status, PageRequest.of(page.coerceAtLeast(0), size.coerceIn(1, 100)))
        val tasksByProject = taskRepository.findByProjectIdInOrderByProjectIdAscPositionAsc(result.content.map { it.id!! }).groupBy { it.projectId }
        val today = LocalDate.now(clock)
        return PageResponse.of(result, result.content.map { summarize(it, tasksByProject[it.id].orEmpty(), today) })
    }

    @Transactional(readOnly = true)
    fun detail(userId: Long, projectId: Long): ProjectDetailResponse {
        val project = owned(userId, projectId)
        return ProjectDetailResponse.of(project, taskRepository.findByProjectIdOrderByPosition(projectId), attachmentLinker.ofProject(projectId))
    }

    @Transactional
    fun update(userId: Long, projectId: Long, request: UpdateProjectRequest): ProjectDetailResponse {
        val project = owned(userId, projectId)
        request.color?.let { project.color = it }
        if (request.status == Project.DONE) project.complete()
        return ProjectDetailResponse.of(project, taskRepository.findByProjectIdOrderByPosition(projectId), attachmentLinker.ofProject(projectId))
    }

    private fun owned(userId: Long, projectId: Long) =
        projectRepository.findByIdAndUserId(projectId, userId) ?: throw ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "프로젝트를 찾을 수 없어요.")

    private fun validateTasks(request: CreateProjectRequest) {
        val keys = request.tasks.map { it.key }
        fun invalid(message: String): Nothing = throw ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", message)
        if (keys.toSet().size != keys.size) invalid("작업 key가 겹쳐요.")
        request.tasks.forEach { t ->
            val dep = t.dependsOnKey ?: return@forEach
            if (dep == t.key || dep !in keys) invalid("선행 작업을 찾을 수 없어요.")
        }
    }

    private fun summarize(p: Project, tasks: List<Task>, today: LocalDate): ProjectSummaryResponse {
        // 밀림: 오늘로 옮겨진 작업(delayedFrom) 또는 아직 옮기기 전인 지난 작업
        val overdue = tasks.filter { !it.done && (it.delayedFrom != null || it.isOverdue(today)) }.sortedBy { it.delayedFrom ?: it.scheduledDate }
        val next = tasks.filter { !it.done }.sortedWith(compareBy(nullsLast()) { it.scheduledDate }).firstOrNull()
        return ProjectSummaryResponse(
            p.id!!, p.name, p.description, p.deadline, p.status, p.color,
            doneCount = tasks.count { it.done },
            totalCount = tasks.size,
            overdueCount = overdue.size,
            firstOverdueTitle = overdue.firstOrNull()?.title,
            nextTaskTitle = next?.title,
        )
    }
}
