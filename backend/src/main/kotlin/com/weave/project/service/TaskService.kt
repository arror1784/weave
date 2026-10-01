package com.weave.project.service

import com.weave.global.error.ApiException
import com.weave.project.domain.Project
import com.weave.project.dto.TaskResponse
import com.weave.project.dto.UpdateTaskRequest
import com.weave.project.dto.UpdateTaskResponse
import com.weave.project.repository.ProjectRepository
import com.weave.project.repository.TaskRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class TaskService(
    private val taskRepository: TaskRepository,
    private val projectRepository: ProjectRepository,
) {
    /** 완료 체크만 — 제목·시간·날짜는 바꿀 수 없다(사용자 결정 B) */
    @Transactional
    fun update(userId: Long, taskId: Long, request: UpdateTaskRequest): UpdateTaskResponse {
        val task = taskRepository.findOwned(taskId, userId) ?: throw ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "작업을 찾을 수 없어요.")
        task.done = request.done
        val project = projectRepository.findById(task.projectId).orElseThrow()
        val allDone = project.status == Project.ACTIVE && taskRepository.findByProjectIdOrderByPosition(project.id!!).all { it.done }
        return UpdateTaskResponse(TaskResponse.of(task), allDone)
    }
}
