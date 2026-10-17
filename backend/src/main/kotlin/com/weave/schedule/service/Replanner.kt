package com.weave.schedule.service

import com.weave.holiday.service.AvailabilityService
import com.weave.project.domain.Project
import com.weave.project.domain.Task
import com.weave.project.repository.ProjectRepository
import com.weave.project.repository.TaskRepository
import com.weave.schedule.domain.NewTask
import com.weave.schedule.domain.Placement
import com.weave.schedule.domain.PlanProject
import com.weave.schedule.domain.Scheduler
import com.weave.schedule.domain.StandingSlots
import com.weave.user.domain.User
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

/**
 * 진행중 프로젝트의 작업을 오늘부터 다시 배치한다(임시 일정 알고리즘 Scheduler).
 * - 새 프로젝트 등록 때: 오늘로 옮겨진 밀린 작업(추가 작업)은 그대로 두고 나머지를 배치(사용자 결정).
 * - 설정의 "작업 다시 배치" 버튼: 밀린 작업도 포함해 전부 배치 — 지연 표시(delayedFrom)는 남긴다(사용자 결정).
 * 완료한 작업은 어느 때든 그대로 둔다.
 */
@Service
class Replanner(
    private val projectRepository: ProjectRepository,
    private val taskRepository: TaskRepository,
    private val availabilityService: AvailabilityService,
) {
    /** 사용자의 요일별·공휴일 가용 시간과 상시 칸으로 배치한다 */
    @Transactional
    fun replan(user: User, today: LocalDate, includeDelayed: Boolean): Map<Long, Placement> =
        replan(user.id!!, today, availabilityService.capacityOn(user, today), user.standingSlots(), includeDelayed)

    /** 반환: 작업 id → 배치 결과 */
    @Transactional
    fun replan(userId: Long, today: LocalDate, capacityOn: (LocalDate) -> Double, standing: StandingSlots, includeDelayed: Boolean): Map<Long, Placement> {
        val projects = projectRepository.findByUserIdAndStatus(userId, Project.ACTIVE).sortedBy { it.id }
        if (projects.isEmpty()) return emptyMap()
        val tasks = taskRepository.findByProjectIdInOrderByProjectIdAscPositionAsc(projects.map { it.id!! })
        val movable = tasks.filter { !it.done && (includeDelayed || !it.isExtraToday(today)) }
        val key = { id: Long -> id.toString() }
        val plan = Scheduler.plan(
            projects.mapIndexed { order, p ->
                PlanProject(
                    key(p.id!!),
                    p.deadline,
                    order,
                    movable.filter { it.projectId == p.id }.map { t -> NewTask(key(t.id!!), t.estimatedHours ?: 0.5, t.dependsOnId?.let(key)) },
                )
            },
            today,
            capacityOn,
            standing,
        ).associateBy { it.key.toLong() }
        movable.forEach { t -> plan[t.id!!]?.let(t::reschedule) }
        return plan
    }

    /** 밀려서 오늘로 옮겨진 추가 작업 — 등록 때 다시 배치하지 않는다 */
    private fun Task.isExtraToday(today: LocalDate) = delayedFrom != null && scheduledDate == today
}
