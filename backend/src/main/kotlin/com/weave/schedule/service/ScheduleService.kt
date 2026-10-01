package com.weave.schedule.service

import com.weave.project.domain.Project
import com.weave.project.dto.TaskResponse
import com.weave.project.repository.ProjectRepository
import com.weave.project.repository.TaskRepository
import com.weave.schedule.dto.ProjectBriefResponse
import com.weave.schedule.dto.ScheduleResponse
import com.weave.user.service.UserService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate

@Service
class ScheduleService(
    private val projectRepository: ProjectRepository,
    private val taskRepository: TaskRepository,
    private val userService: UserService,
    private val clock: Clock,
) {
    @Transactional(readOnly = true)
    fun snapshot(userId: Long): ScheduleResponse {
        val user = userService.find(userId)
        val projects = projectRepository.findByUserIdAndStatus(userId, Project.ACTIVE).sortedBy { it.id }
        val tasks = if (projects.isEmpty()) emptyList() else taskRepository.findByProjectIdInOrderByProjectIdAscPositionAsc(projects.map { it.id!! })
        return ScheduleResponse(LocalDate.now(clock), user.dailyAvailableHours, projects.map(ProjectBriefResponse::of), tasks.map(TaskResponse::of))
    }
}
