package com.weave.schedule.service

import com.weave.project.domain.Project
import com.weave.project.repository.ProjectRepository
import com.weave.project.repository.TaskRepository
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate

/**
 * 밀린 작업(끝나는 날이 지났는데 미완료)을 오늘로 옮긴다 — 다른 작업 배치는 바꾸지 않는 추가 작업(사용자 결정 2026-10-01).
 * 매일 0시 5분(한국 시간)에 모두, 그리고 일정을 읽거나 새로 배치하기 직전에 그 사용자 것을 한 번 더 옮긴다.
 */
@Service
class OverdueRoller(
    private val projectRepository: ProjectRepository,
    private val taskRepository: TaskRepository,
    private val clock: Clock,
) {
    @Transactional
    fun roll(userId: Long) {
        val today = LocalDate.now(clock)
        val ids = projectRepository.findByUserIdAndStatus(userId, Project.ACTIVE).map { it.id!! }
        if (ids.isEmpty()) return
        taskRepository.findByProjectIdInOrderByProjectIdAscPositionAsc(ids).filter { it.isOverdue(today) }.forEach { it.moveToToday(today) }
    }

    @Scheduled(cron = "0 5 0 * * *", zone = "Asia/Seoul")
    @Transactional
    fun rollAll() {
        val today = LocalDate.now(clock)
        taskRepository.findOverdueCandidates(today).filter { it.isOverdue(today) }.forEach { it.moveToToday(today) }
    }
}
