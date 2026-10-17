package com.weave.project.service

import com.weave.activity.domain.ActivityType
import com.weave.activity.service.ActivityRecorder
import com.weave.activity.service.TaskLog
import com.weave.global.time.TodayProvider
import com.weave.attachment.service.AttachmentLinker
import com.weave.global.error.ApiException
import com.weave.global.web.PageResponse
import com.weave.project.domain.Project
import com.weave.project.domain.Task
import com.weave.project.dto.CreateProjectRequest
import com.weave.project.dto.CreateTaskRequest
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
import java.time.LocalDate

@Service
class ProjectService(
    private val projectRepository: ProjectRepository,
    private val taskRepository: TaskRepository,
    private val attachmentLinker: AttachmentLinker,
    private val userService: UserService,
    private val overdueRoller: OverdueRoller,
    private val replanner: Replanner,
    private val todayProvider: TodayProvider,
    private val activityRecorder: ActivityRecorder,
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
        val today = todayProvider.today()

        val project = projectRepository.save(Project(userId, request.name.trim(), request.description.trim(), request.deadline, request.color, request.deliverable.trim(), request.progress.trim()))
        val saved = saveTasks(project.id!!, request.tasks, firstPosition = 0)

        val placements = replanner.replan(user, today, includeDelayed = false)
        attachmentLinker.link(userId, request.attachmentIds, project.id!!)

        val tasks = saved.sortedBy { it.position }
        val lateCount = tasks.count { placements[it.id!!]?.late == true }
        activityRecorder.record(
            userId, ActivityType.PROJECT_CREATED, projectId = project.id,
            detail = mapOf(
                "name" to project.name, "deadline" to project.deadline?.toString(), "color" to project.color,
                "taskCount" to tasks.size, "totalHours" to tasks.sumOf { it.estimatedHours ?: 0.0 },
                "attachmentCount" to request.attachmentIds.size, "lateCount" to lateCount, "conversationId" to request.conversationId,
                "tasks" to taskLog(tasks),
            ),
        )
        return CreateProjectResponse(ProjectDetailResponse.of(project, tasks, attachmentLinker.ofProject(project.id!!)), lateCount)
    }

    /**
     * "AI에게 재요청" 확정(사용자 결정 2026-10-02): 기본 정보를 바꾸고, 완료한 작업은 남긴 채 미완료 작업만 새 작업으로 바꾼다.
     * 첨부는 요청 목록대로 맞추고(새 첨부 연결·뺀 첨부 삭제), 등록 때처럼 진행중 프로젝트 전체를 오늘부터 다시 배치한다.
     * 완료한 프로젝트는 되돌리지 않으므로(사용자 결정) 재요청할 수 없다.
     */
    @Transactional
    fun replaceTasks(userId: Long, projectId: Long, request: CreateProjectRequest): CreateProjectResponse {
        validateTasks(request)
        val project = owned(userId, projectId)
        if (project.status == Project.DONE) throw ApiException(HttpStatus.CONFLICT, "PROJECT_DONE", "완료한 프로젝트는 다시 나눌 수 없어요.")
        val user = userService.find(userId)
        overdueRoller.roll(userId)
        val today = todayProvider.today()

        project.updateInfo(request.name.trim(), request.description.trim(), request.deadline, request.color, request.deliverable.trim(), request.progress.trim())
        val (kept, removed) = taskRepository.findByProjectIdOrderByPosition(projectId).partition { it.done }
        val removedIds = removed.map { it.id!! }.toSet()
        kept.filter { it.dependsOnId in removedIds }.forEach { it.dependsOnId = null }
        taskRepository.deleteAll(removed)
        val saved = saveTasks(projectId, request.tasks, firstPosition = (kept.maxOfOrNull { it.position } ?: -1) + 1)
        attachmentLinker.sync(userId, request.attachmentIds, projectId)

        val placements = replanner.replan(user, today, includeDelayed = false)
        val tasks = (kept + saved).sortedBy { it.position }
        val lateCount = saved.count { placements[it.id!!]?.late == true }
        activityRecorder.record(
            userId, ActivityType.PROJECT_REPLANNED, projectId = projectId,
            detail = mapOf(
                "name" to project.name, "deadline" to project.deadline?.toString(),
                "keptDone" to kept.size, "removed" to removed.size, "added" to saved.size,
                "addedHours" to saved.sumOf { it.estimatedHours ?: 0.0 }, "lateCount" to lateCount, "conversationId" to request.conversationId,
                "tasks" to taskLog(saved.sortedBy { it.position }),
            ),
        )
        return CreateProjectResponse(ProjectDetailResponse.of(project, tasks, attachmentLinker.ofProject(projectId)), lateCount)
    }

    /** 사용 기록용 확정 작업 목록 — 검토 화면에서 고친 것을 AI 제안과 비교하려고(2026-10-17) */
    private fun taskLog(tasks: List<Task>): List<Map<String, Any?>> {
        val titles = tasks.associate { it.id!! to it.title }
        return tasks.map { TaskLog.entry(it.title, it.estimatedHours, it.dependsOnId?.let(titles::get), it.prerequisite) }
    }

    /** 작업을 저장하고 선행 작업을 key로 잇는다 — id는 저장 후에야 생기므로 두 번에 나눈다 */
    private fun saveTasks(projectId: Long, requests: List<CreateTaskRequest>, firstPosition: Int): List<Task> {
        val saved = requests.mapIndexed { i, t ->
            t.key to taskRepository.save(Task(projectId, firstPosition + i, t.title.trim(), t.description.trim(), t.estimatedHours, null, 1, null, t.prerequisite))
        }.toMap()
        requests.forEach { t -> t.dependsOnKey?.let { saved.getValue(t.key).dependsOnId = saved.getValue(it).id } }
        return saved.values.toList()
    }

    @Transactional(readOnly = true)
    fun list(userId: Long, status: String, page: Int, size: Int): PageResponse<ProjectSummaryResponse> {
        if (status != Project.ACTIVE && status != Project.DONE) throw ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "status는 active 또는 done이에요.")
        val result = projectRepository.findPage(userId, status, PageRequest.of(page.coerceAtLeast(0), size.coerceIn(1, 100)))
        val tasksByProject = taskRepository.findByProjectIdInOrderByProjectIdAscPositionAsc(result.content.map { it.id!! }).groupBy { it.projectId }
        val today = todayProvider.today()
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
        request.color?.takeIf { it != project.color }?.let {
            activityRecorder.record(userId, ActivityType.PROJECT_COLOR_CHANGED, projectId = projectId, detail = mapOf("name" to project.name, "from" to project.color, "to" to it))
            project.color = it
        }
        if (request.status == Project.DONE && project.status != Project.DONE) {
            project.complete()
            activityRecorder.record(userId, ActivityType.PROJECT_COMPLETED, projectId = projectId, detail = mapOf("name" to project.name))
        }
        return ProjectDetailResponse.of(project, taskRepository.findByProjectIdOrderByPosition(projectId), attachmentLinker.ofProject(projectId))
    }

    /**
     * 프로젝트 삭제 — 상시 프로젝트를 끝낼 때 등(사용자 결정 2026-10-01). 프로젝트·작업·첨부 행은 소프트 삭제, 첨부 파일은 디스크에서 지운다.
     * 지운 뒤 남은 진행중 프로젝트의 미완료 작업을 등록 때처럼 오늘부터 다시 배치한다 — 밀린 작업은 그대로(사용자 결정 2026-10-08).
     */
    @Transactional
    fun delete(userId: Long, projectId: Long) {
        val project = owned(userId, projectId)
        val user = userService.find(userId)
        overdueRoller.roll(userId)
        val tasks = taskRepository.findByProjectIdOrderByPosition(projectId)
        activityRecorder.record(
            userId, ActivityType.PROJECT_DELETED, projectId = projectId,
            detail = mapOf("name" to project.name, "status" to project.status, "taskCount" to tasks.size, "doneCount" to tasks.count { it.done }),
        )
        attachmentLinker.deleteOfProject(projectId)
        taskRepository.deleteAll(tasks)
        projectRepository.delete(project)
        replanner.replan(user, todayProvider.today(), includeDelayed = false)
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
