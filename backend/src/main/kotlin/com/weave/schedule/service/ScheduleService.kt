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
    private val overdueRoller: OverdueRoller,
    private val replanner: Replanner,
    private val clock: Clock,
) {
    /** 설정의 "작업 다시 배치" — 밀린 작업까지 오늘부터 다시 배치한 뒤의 일정(사용자 결정 2026-10-01) */
    @Transactional
    fun replan(userId: Long): ScheduleResponse {
        val user = userService.find(userId)
        overdueRoller.roll(userId)
        replanner.replan(userId, LocalDate.now(clock), user.dailyAvailableHours, includeDelayed = true)
        return snapshot(userId)
    }

    /** 밀린 작업을 오늘로 옮긴 뒤의 일정 */
    @Transactional
    fun snapshot(userId: Long): ScheduleResponse {
        overdueRoller.roll(userId)
        val user = userService.find(userId)
        val projects = projectRepository.findByUserIdAndStatus(userId, Project.ACTIVE).sortedBy { it.id }
        val tasks = if (projects.isEmpty()) emptyList() else taskRepository.findByProjectIdInOrderByProjectIdAscPositionAsc(projects.map { it.id!! })
        return ScheduleResponse(LocalDate.now(clock), user.dailyAvailableHours, projects.map(ProjectBriefResponse::of), tasks.map(TaskResponse::of))
    }
}
