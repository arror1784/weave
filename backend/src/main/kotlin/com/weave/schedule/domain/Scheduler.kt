package com.weave.schedule.domain

import java.time.LocalDate
import java.time.temporal.ChronoUnit
import kotlin.math.ceil
import kotlin.math.max

/** 새로 배정할 작업 — key는 같은 등록 요청 안의 식별자 */
data class NewTask(val key: String, val hours: Double, val dependsOnKey: String?)

/** 부하 계산에 필요한 기존 작업 필드 */
data class ScheduledTask(val scheduledDate: LocalDate?, val spanDays: Int, val estimatedHours: Double?, val done: Boolean)

data class Placement(val key: String, val scheduledDate: LocalDate, val spanDays: Int, val dueDate: LocalDate, val late: Boolean)

/**
 * ⚠ 임시 일정 생성 알고리즘 — 사용자가 실제 알고리즘을 설계하는 중이라 Claude가 임의로 정한 규칙이다.
 *   사용자 확인 후 바뀔 수 있다. 바꾸면 이 주석과 SchedulerTest를 함께 고친다. (앱에서 옮겨 온 것 — 이제 서버가 날짜를 정한다)
 *   1. 새 프로젝트를 등록할 때 그 작업에만 날짜를 배정한다. 이미 배정된 작업은 옮기지 않고, 쓰는 시간만 뺀다.
 *   2. 여러 날 작업은 소요 시간을 기간에 똑같이 나눠 하루 몫으로 센다. 밀린 작업은 전부 오늘 부하로 센다.
 *   3. 선행 작업을 먼저, 그 밖엔 AI 제안 순서대로. 기간 = ceil(소요 시간 ÷ 하루 가용 시간)일.
 *   4. 시작일 = 오늘(선행 작업이 있으면 그 작업이 끝나는 날)부터, 기간 내내 하루 몫이 남는 가장 이른 날. 주말도 쓴다.
 *   5. 작업 마감일 = 프로젝트 마감이 있으면 뒤에서부터(뒤따르는 작업 마감 − 그 작업 기간, 오늘보다 앞서지 않음), 없으면 끝나는 날.
 *   6. 끝나는 날이 작업 마감일보다 늦으면 late — 등록 응답에 개수를 알린다.
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

    fun scheduleNewTasks(
        tasks: List<NewTask>,
        deadline: LocalDate?,
        today: LocalDate,
        capacity: Double,
        existing: List<ScheduledTask>,
    ): List<Placement> {
        val used = HashMap<LocalDate, Double>()
        fun add(date: LocalDate, hours: Double) = used.merge(date, hours, Double::plus)
        fun free(date: LocalDate) = capacity - (used[date] ?: 0.0)

        // 1. 이미 배정된 작업의 부하 (밀린 작업은 전부 오늘로)
        for (t in existing) {
            if (t.done || t.scheduledDate == null) continue
            if (endDate(t)!!.isBefore(today)) {
                add(today, t.estimatedHours ?: 0.0)
                continue
            }
            for (i in 0 until max(1, t.spanDays)) {
                val date = t.scheduledDate.plusDays(i.toLong())
                if (!date.isBefore(today)) add(date, hoursOn(t, date))
            }
        }

        fun spanOf(t: NewTask) = max(1, ceil(t.hours / capacity - EPSILON).toInt())
        val byKey = tasks.associateBy { it.key }

        // 2. 선행 작업 먼저, 그 밖엔 제안 순서대로 배정
        val placed = HashMap<String, Pair<LocalDate, Int>>()
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
            for (i in 0 until span) add(start.plusDays(i.toLong()), perDay)
            placed[t.key] = start to span
        }
        tasks.forEach { place(it, mutableSetOf()) }

        // 3. 작업 마감일: 마감이 있으면 뒤에서부터(뒤따르는 작업의 마감 − 그 작업 기간), 없으면 끝나는 날
        val due = HashMap<String, LocalDate>()
        fun dueOf(t: NewTask, visiting: MutableSet<String>): LocalDate {
            due[t.key]?.let { return it }
            val (start, span) = placed.getValue(t.key)
            val result = if (deadline == null) {
                start.plusDays(span - 1L)
            } else {
                visiting += t.key
                var latest: LocalDate = deadline
                for (next in tasks.filter { it.dependsOnKey == t.key && it.key !in visiting }) {
                    val candidate = dueOf(next, visiting).minusDays(spanOf(next).toLong())
                    if (candidate.isBefore(latest)) latest = candidate
                }
                if (latest.isBefore(today)) today else latest
            }
            due[t.key] = result
            return result
        }

        return tasks.map { t ->
            val (start, span) = placed.getValue(t.key)
            val dueDate = dueOf(t, mutableSetOf())
            Placement(t.key, start, span, dueDate, start.plusDays(span - 1L).isAfter(dueDate))
        }
    }
}
