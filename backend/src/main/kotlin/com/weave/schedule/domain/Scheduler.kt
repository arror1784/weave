package com.weave.schedule.domain

import java.time.LocalDate
import java.time.temporal.ChronoUnit
import kotlin.math.ceil
import kotlin.math.max

/** 배치할 작업 — key는 이번 배치 전체에서 유일해야 한다. 선행 작업이 이번 배치에 없으면(완료·밀림) 오늘부터 시작할 수 있다 */
data class NewTask(val key: String, val hours: Double, val dependsOnKey: String?)

/** 다시 배치할 프로젝트 — order는 마감이 같을 때 먼저 등록한 순서 */
data class PlanProject(val key: String, val deadline: LocalDate?, val order: Int, val tasks: List<NewTask>)

/** 부하 계산에 필요한 작업 필드 */
data class ScheduledTask(val scheduledDate: LocalDate?, val spanDays: Int, val estimatedHours: Double?, val done: Boolean)

data class Placement(val key: String, val scheduledDate: LocalDate, val spanDays: Int, val dueDate: LocalDate, val late: Boolean)

/**
 * ⚠ 임시 일정 생성 알고리즘 — 사용자가 실제 알고리즘을 설계하는 중이라 Claude가 임의로 정한 규칙에 사용자 결정(2026-10-01)을 반영했다.
 *   사용자 확인 후 바뀔 수 있다. 바꾸면 이 주석과 SchedulerTest를 함께 고친다.
 *   1. 새 프로젝트를 등록하면 진행중 프로젝트의 미완료 작업을 오늘부터 전부 다시 배치한다(사용자 결정). 완료한 작업·밀린 작업은 배치하지 않는다.
 *   2. 마감이 가까운 프로젝트부터 채운다(사용자 결정). 마감 없음은 맨 뒤, 마감이 같으면 먼저 등록한 프로젝트부터.
 *   3. 프로젝트 안에서는 선행 작업 먼저, 그 밖엔 정해진 순서대로. 기간 = ceil(소요 시간 ÷ 하루 가용 시간)일, 하루 몫 = 소요 시간 ÷ 기간.
 *   4. 시작일 = 오늘(선행 작업이 있으면 그 작업이 끝나는 날)부터, 기간 내내 하루 몫이 남는 가장 이른 날. 주말도 쓴다.
 *   5. 작업 마감일 = 프로젝트 마감이 있으면 뒤에서부터(뒤따르는 작업 마감 − 그 작업 기간, 오늘보다 앞서지 않음), 없으면 끝나는 날.
 *   6. 끝나는 날이 작업 마감일보다 늦으면 late — 등록 응답에 개수를 알린다.
 *   밀린 작업은 따로(OverdueRoller): 오늘로 옮기고 원래 끝나는 날을 기억해 "밀림"으로 보여준다. 다른 작업 자리를 차지하지 않는 추가 작업이다(사용자 결정).
 */
object Scheduler {
    private const val EPSILON = 1e-9

    /** 1년 안에 자리가 없으면 가장 이른 시작 가능일에 그냥 넣는다(과부하로 보인다) */
    private const val SEARCH_DAYS = 365L

    fun endDate(task: ScheduledTask): LocalDate? = task.scheduledDate?.plusDays(max(1, task.spanDays) - 1L)

    fun hoursOn(task: ScheduledTask, date: LocalDate): Double {
        val start = task.scheduledDate ?: return 0.0
        val offset = ChronoUnit.DAYS.between(start, date)
        val span = max(1, task.spanDays)
        return if (offset in 0 until span) (task.estimatedHours ?: 0.0) / span else 0.0
    }

    /** 결과는 입력 순서(프로젝트 순서 → 작업 순서)대로 */
    fun plan(projects: List<PlanProject>, today: LocalDate, capacity: Double): List<Placement> {
        val used = HashMap<LocalDate, Double>()
        fun free(date: LocalDate) = capacity - (used[date] ?: 0.0)
        fun spanOf(t: NewTask) = max(1, ceil(t.hours / capacity - EPSILON).toInt())

        val placed = HashMap<String, Pair<LocalDate, Int>>()
        val priority = projects.sortedWith(compareBy<PlanProject, LocalDate?>(nullsLast()) { it.deadline }.thenBy { it.order })
        for (project in priority) {
            val byKey = project.tasks.associateBy { it.key }
            fun place(t: NewTask, visiting: MutableSet<String>) {
                if (t.key in placed) return
                visiting += t.key
                val before = t.dependsOnKey?.let(byKey::get)
                if (before != null && before.key !in visiting) place(before, visiting)
                val dep = before?.let { placed[it.key] }
                val earliest = dep?.let { (start, span) -> start.plusDays(span - 1L) } ?: today
                val span = spanOf(t)
                val perDay = t.hours / span
                var start = earliest
                for (offset in 0 until SEARCH_DAYS) {
                    val candidate = earliest.plusDays(offset)
                    if ((0 until span).all { free(candidate.plusDays(it.toLong())) + EPSILON >= perDay }) {
                        start = candidate
                        break
                    }
                }
                for (i in 0 until span) used.merge(start.plusDays(i.toLong()), perDay, Double::plus)
                placed[t.key] = start to span
            }
            project.tasks.forEach { place(it, mutableSetOf()) }
        }

        return projects.flatMap { project -> placements(project, placed, today, ::spanOf) }
    }

    /** 작업 마감일: 마감이 있으면 뒤에서부터(뒤따르는 작업의 마감 − 그 작업 기간), 없으면 끝나는 날 */
    private fun placements(project: PlanProject, placed: Map<String, Pair<LocalDate, Int>>, today: LocalDate, spanOf: (NewTask) -> Int): List<Placement> {
        val due = HashMap<String, LocalDate>()
        fun dueOf(t: NewTask, visiting: MutableSet<String>): LocalDate {
            due[t.key]?.let { return it }
            val (start, span) = placed.getValue(t.key)
            val deadline = project.deadline
            val result = if (deadline == null) {
                start.plusDays(span - 1L)
            } else {
                visiting += t.key
                var latest: LocalDate = deadline
                for (next in project.tasks.filter { it.dependsOnKey == t.key && it.key !in visiting }) {
                    val candidate = dueOf(next, visiting).minusDays(spanOf(next).toLong())
                    if (candidate.isBefore(latest)) latest = candidate
                }
                if (latest.isBefore(today)) today else latest
            }
            due[t.key] = result
            return result
        }
        return project.tasks.map { t ->
            val (start, span) = placed.getValue(t.key)
            val dueDate = dueOf(t, mutableSetOf())
            Placement(t.key, start, span, dueDate, start.plusDays(span - 1L).isAfter(dueDate))
        }
    }
}
