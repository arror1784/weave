package com.weave.schedule.service

import com.weave.activity.domain.ActivityType
import com.weave.activity.service.ActivityRecorder
import com.weave.global.time.TodayProvider
import com.weave.project.domain.Project
import com.weave.project.repository.ProjectRepository
import com.weave.project.repository.TaskRepository
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

/**
 * 밀린 작업(끝나는 날이 지났는데 미완료)을 오늘로 옮긴다 — 다른 작업 배치는 바꾸지 않는 추가 작업(사용자 결정 2026-10-01).
 * 매일 아침 6시 5분(한국 시간, 하루가 바뀌는 때)에 모두, 그리고 일정을 읽거나 새로 배치하기 직전에 그 사용자 것을 한 번 더 옮긴다.
 */
@Service
class OverdueRoller(
    private val projectRepository: ProjectRepository,
    private val taskRepository: TaskRepository,
    private val todayProvider: TodayProvider,
    private val activityRecorder: ActivityRecorder,
) {
    @Transactional
    fun roll(userId: Long) {
        val today = todayProvider.today()
        val ids = projectRepository.findByUserIdAndStatus(userId, Project.ACTIVE).map { it.id!! }
        if (ids.isEmpty()) return
        val moved = taskRepository.findByProjectIdInOrderByProjectIdAscPositionAsc(ids).filter { it.isOverdue(today) }
        moved.forEach { it.moveToToday(today) }
        // 옮긴 게 있을 때만 남긴다 — 일정 조회마다 불리므로
        if (moved.isNotEmpty()) activityRecorder.record(userId, ActivityType.OVERDUE_MOVED, detail = mapOf("count" to moved.size, "titles" to moved.map { it.title }, "today" to today.toString()))
    }

    @Scheduled(cron = "0 5 6 * * *", zone = "Asia/Seoul")
    @Transactional
    fun rollAll() {
        val today = todayProvider.today()
        val moved = taskRepository.findOverdueCandidates(today).filter { it.isOverdue(today) }
        moved.forEach { it.moveToToday(today) }
        val owners = projectRepository.findAllById(moved.map { it.projectId }.toSet()).associate { it.id!! to it.userId }
        moved.groupBy { owners.getValue(it.projectId) }.forEach { (userId, tasks) ->
            activityRecorder.record(userId, ActivityType.OVERDUE_MOVED, detail = mapOf("count" to tasks.size, "titles" to tasks.map { it.title }, "today" to today.toString(), "by" to "6시 정기 작업"))
        }
    }
}
