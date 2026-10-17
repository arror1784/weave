package com.weave.project.service

import com.weave.activity.domain.ActivityType
import com.weave.activity.service.ActivityRecorder
import com.weave.global.error.ApiException
import com.weave.project.domain.Project
import com.weave.project.dto.TaskResponse
import com.weave.project.dto.UpdateTaskRequest
import com.weave.project.dto.UpdateTaskResponse
import com.weave.project.repository.ProjectRepository
import com.weave.project.repository.TaskRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import java.time.Clock
import org.springframework.transaction.annotation.Transactional

@Service
class TaskService(
    private val taskRepository: TaskRepository,
    private val projectRepository: ProjectRepository,
    private val activityRecorder: ActivityRecorder,
    private val clock: Clock,
) {
    /** 완료 체크만 — 제목·시간·날짜는 바꿀 수 없다(사용자 결정 B) */
    @Transactional
    fun update(userId: Long, taskId: Long, request: UpdateTaskRequest): UpdateTaskResponse {
        val task = taskRepository.findOwned(taskId, userId) ?: throw ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "작업을 찾을 수 없어요.")
        val project = projectRepository.findById(task.projectId).orElseThrow()
        if (task.done != request.done) {
            task.markDone(request.done, clock.instant())
            activityRecorder.record(
                userId, if (request.done) ActivityType.TASK_DONE else ActivityType.TASK_UNDONE, projectId = project.id, taskId = task.id,
                detail = mapOf("title" to task.title, "projectName" to project.name, "estimatedHours" to task.estimatedHours, "scheduledDate" to task.scheduledDate?.toString(), "delayedFrom" to task.delayedFrom?.toString()),
            )
        }
        // 완료한 프로젝트의 작업 체크를 풀면 진행중으로 돌아간다(사용자 결정 2026-10-18). 다시 배치는 하지 않는다 — 체크·해제와 같은 규칙
        val reopened = !request.done && project.status == Project.DONE
        if (reopened) {
            project.reopen()
            activityRecorder.record(userId, ActivityType.PROJECT_REOPENED, projectId = project.id, detail = mapOf("name" to project.name, "taskTitle" to task.title))
        }
        val allDone = project.status == Project.ACTIVE && taskRepository.findByProjectIdOrderByPosition(project.id!!).all { it.done }
        return UpdateTaskResponse(TaskResponse.of(task), allDone, reopened)
    }
}
