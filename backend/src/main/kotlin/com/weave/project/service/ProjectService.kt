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
import com.weave.schedule.domain.NewTask
import com.weave.schedule.domain.Scheduler
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
    private val clock: Clock,
) {
    /** 등록: 작업 날짜는 서버가 임시 일정 알고리즘(Scheduler)으로 정한다 */
    @Transactional
    fun create(userId: Long, request: CreateProjectRequest): CreateProjectResponse {
        validateTasks(request)
        val user = userService.find(userId)
        val today = LocalDate.now(clock)
        val existing = activeTasks(userId).map(Task::toScheduled)
        val placements = Scheduler.scheduleNewTasks(
            request.tasks.map { NewTask(it.key, it.estimatedHours, it.dependsOnKey) },
            request.deadline,
            today,
            user.dailyAvailableHours,
            existing,
        ).associateBy { it.key }

        val project = projectRepository.save(Project(userId, request.name.trim(), request.description.trim(), request.deadline, request.color))
        val saved = request.tasks.mapIndexed { i, t ->
            val p = placements.getValue(t.key)
            t.key to taskRepository.save(Task(project.id!!, i, t.title.trim(), t.estimatedHours, p.scheduledDate, p.spanDays, p.dueDate, t.prerequisite))
        }.toMap()
        request.tasks.forEach { t -> t.dependsOnKey?.let { saved.getValue(t.key).dependsOnId = saved.getValue(it).id } }
        attachmentLinker.link(userId, request.attachmentIds, project.id!!)

        val tasks = saved.values.sortedBy { it.position }
        return CreateProjectResponse(ProjectDetailResponse.of(project, tasks, attachmentLinker.ofProject(project.id!!)), placements.values.count { it.late })
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

    private fun activeTasks(userId: Long): List<Task> {
        val ids = projectRepository.findByUserIdAndStatus(userId, Project.ACTIVE).map { it.id!! }
        return if (ids.isEmpty()) emptyList() else taskRepository.findByProjectIdInOrderByProjectIdAscPositionAsc(ids)
    }

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
        val overdue = tasks.filter { !it.done && Scheduler.endDate(it.toScheduled())?.isBefore(today) == true }.sortedBy { it.scheduledDate }
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
