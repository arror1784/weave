package com.weave.schedule.domain

import java.time.LocalDate
import java.time.temporal.ChronoUnit
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.min

/** 배치할 작업 — key는 이번 배치 전체에서 유일해야 한다. 선행 작업이 이번 배치에 없으면(완료·밀림) 오늘부터 시작할 수 있다 */
data class NewTask(val key: String, val hours: Double, val dependsOnKey: String?)

/** 다시 배치할 프로젝트 — order는 마감이 같을 때 먼저 등록한 순서 */
data class PlanProject(val key: String, val deadline: LocalDate?, val order: Int, val tasks: List<NewTask>)

data class DayHours(val date: LocalDate, val hours: Double)

/** 상시 프로젝트에 떼어 두는 칸 — 주 perWeek번 × hours시간(사용자 설정, 기본 주 2번 × 1시간) */
data class StandingSlots(val perWeek: Int, val hours: Double) {
    companion object {
        val DEFAULT = StandingSlots(2, 1.0)
    }
}

/** 부하 계산에 필요한 작업 필드 — days가 있으면 날짜별 배정 시간을 그대로 쓴다 */
data class ScheduledTask(val scheduledDate: LocalDate?, val spanDays: Int, val estimatedHours: Double?, val done: Boolean, val days: List<DayHours> = emptyList())

/** 배치 결과 — days: 날짜별 배정 시간, dueDate: 상시 프로젝트면 null, late: 가용 시간 안에 마감을 못 지켜 압축한 작업(빠듯함) */
data class Placement(val key: String, val days: List<DayHours>, val dueDate: LocalDate?, val late: Boolean) {
    /** 배치하지 못한 상시 작업(주 0번 설정 등)은 날짜가 없다 */
    val scheduledDate: LocalDate? get() = days.firstOrNull()?.date
    val spanDays: Int get() = if (days.isEmpty()) 1 else (ChronoUnit.DAYS.between(days.first().date, days.last().date) + 1).toInt()
}

/**
 * ⚠ 일정 생성 알고리즘 — Claude 임시안에 사용자 결정(2026-10-01)을 반영했다. 사용자가 설계 중이라 바뀔 수 있다.
 *   바꾸면 이 주석과 SchedulerTest를 함께 고친다.
 *   1. 새 프로젝트 등록·"다시 배치" 버튼 때 진행중 프로젝트의 미완료 작업을 오늘부터 전부 다시 배치한다. 완료한 작업은 배치하지 않는다.
 *   2. 마감이 가까운 프로젝트부터 채운다. 마감이 같으면 먼저 등록한 프로젝트부터. 상시(마감 없음)는 7번.
 *   3. 프로젝트 안에서는 선행 작업 먼저, 그 밖엔 AI 제안(검토 화면에서 고친) 순서대로.
 *   4. 하루에 최대한 채워 앞당긴다: 시작 가능일(오늘, 선행 작업이 있으면 그 작업이 끝나는 날)부터 날마다 남은 가용 시간만큼 넣는다.
 *      (4시간·하루 3시간 → 3 + 1) 주말도 쓴다.
 *   5. 작업 마감일 = 프로젝트 마감에서 거꾸로(뒤따르는 작업 마감 − 그 작업을 하루 가용으로 끝내는 데 드는 날 수, 오늘보다 앞서지 않음).
 *      상시 프로젝트의 작업은 마감일이 없다.
 *   6. 가용 시간 안에서 작업 마감일까지 못 끝내면, 과부하가 걸려도 마감을 지킨다: 마감일까지 남은 시간을 채우고
 *      나머지(초과분)는 가장 이른 날에 얹는다. 이런 작업을 late(빠듯함)로 표시해 등록 알림에 개수를 알린다.
 *   7. 상시 프로젝트(사용자 결정 2026-10-17)는 마감 작업을 다 배치한 뒤, 떼어 둔 칸(주 perWeek번 × hours시간)에만 넣는다.
 *      주는 월~일. 그 주에서 가장 한가한 날(같으면 이른 날)부터, 하루에 한 칸까지 — 이번 주에 남은 날이 적으면 남은 날 수만큼만.
 *      칸을 넣으면 하루 가용을 넘는 날은 건너뛴다(마감 작업은 밀지 않는다). 칸 시간이 하루 가용보다 크면 하루 가용만큼(Claude 해석).
 *      상시 프로젝트가 여럿이면 칸을 번갈아(먼저 등록한 프로젝트부터) 쓰고, 칸보다 긴 작업은 여러 칸에 나눠 넣는다.
 *      칸에 남는 시간은 같은 프로젝트의 다음 작업이, 그 프로젝트 작업이 다 끝났으면 다음 상시 프로젝트가 쓴다(Claude 해석).
 *      주 0번이면 배치하지 않는다(날짜 없음).
 *   밀린 작업은 따로(OverdueRoller): 오늘로 옮기고 원래 끝나는 날을 기억해 "지연"으로 보여준다. 다른 작업 자리를 차지하지 않는 추가 작업이다.
 */
object Scheduler {
    private const val EPSILON = 1e-9

    /** 1년 안에 자리가 없으면 마지막 날에 남은 시간을 얹는다(과부하로 보인다) */
    private const val SEARCH_DAYS = 365L

    fun endDate(task: ScheduledTask): LocalDate? =
        task.days.lastOrNull()?.date ?: task.scheduledDate?.plusDays(max(1, task.spanDays) - 1L)

    fun hoursOn(task: ScheduledTask, date: LocalDate): Double {
        if (task.days.isNotEmpty()) return task.days.filter { it.date == date }.sumOf { it.hours }
        val start = task.scheduledDate ?: return 0.0
        val offset = ChronoUnit.DAYS.between(start, date)
        val span = max(1, task.spanDays)
        return if (offset in 0 until span) (task.estimatedHours ?: 0.0) / span else 0.0
    }

    /** 결과는 입력 순서(프로젝트 순서 → 작업 순서)대로 */
    fun plan(projects: List<PlanProject>, today: LocalDate, capacity: Double, standing: StandingSlots = StandingSlots.DEFAULT): List<Placement> {
        val used = HashMap<LocalDate, Double>()
        fun free(date: LocalDate) = max(0.0, capacity - (used[date] ?: 0.0))
        fun daysNeeded(t: NewTask) = max(1, ceil(t.hours / capacity - EPSILON).toInt())

        val placed = HashMap<String, Placement>()
        val priority = projects.filter { it.deadline != null }.sortedWith(compareBy<PlanProject> { it.deadline }.thenBy { it.order })
        for (project in priority) {
            val byKey = project.tasks.associateBy { it.key }
            val due = dueDates(project, today, ::daysNeeded)
            fun place(t: NewTask, visiting: MutableSet<String>) {
                if (t.key in placed) return
                visiting += t.key
                val before = t.dependsOnKey?.let(byKey::get)
                if (before != null && before.key !in visiting) place(before, visiting)
                val earliest = before?.let { placed[it.key]?.days?.last()?.date } ?: today
                val dueDate = due[t.key]

                // 4. 하루에 최대한 채워 앞당기기
                val greedy = fill(t.hours, earliest, lastDay = null, ::free)
                val compressed = dueDate != null && greedy.last().date.isAfter(dueDate) && !earliest.isAfter(dueDate)
                // 6. 마감일까지 남은 시간을 채우고 초과분은 가장 이른 날에 얹는다
                val days = if (compressed) compress(fill(t.hours, earliest, dueDate, ::free), t.hours, earliest) else greedy
                days.forEach { used.merge(it.date, it.hours, Double::plus) }
                val tight = compressed || (dueDate != null && days.last().date.isAfter(dueDate))
                placed[t.key] = Placement(t.key, days, dueDate, tight)
            }
            project.tasks.forEach { place(it, mutableSetOf()) }
        }
        // 7. 상시 프로젝트 — 마감 작업 배치가 끝난 부하(used)를 보고 칸을 고른다
        placeStanding(projects.filter { it.deadline == null }.sortedBy { it.order }, today, capacity, standing, used)
            .forEach { placed[it.key] = it }
        return projects.flatMap { p -> p.tasks.map { placed.getValue(it.key) } }
    }

    private fun placeStanding(projects: List<PlanProject>, today: LocalDate, capacity: Double, standing: StandingSlots, used: MutableMap<LocalDate, Double>): List<Placement> {
        // 프로젝트마다 선행 작업 먼저 놓은 순서의 남은 시간 대기열
        val queues = projects.map { p -> ArrayDeque(inDependencyOrder(p).map { it.key to it.hours }) }
        val days = projects.flatMap { it.tasks }.associate { it.key to mutableListOf<DayHours>() }
        val slotHours = min(standing.hours, capacity)
        if (standing.perWeek > 0 && slotHours > EPSILON) {
            var turn = 0
            var monday = today.minusDays(today.dayOfWeek.value - 1L)
            while (queues.any { it.isNotEmpty() } && ChronoUnit.DAYS.between(today, monday) < SEARCH_DAYS) {
                val week = (0L..6L).map(monday::plusDays).filter { !it.isBefore(today) }
                val chosen = week.sortedWith(compareBy<LocalDate> { used[it] ?: 0.0 }.thenBy { it }).take(standing.perWeek).sorted()
                for (date in chosen) {
                    val amount = min(slotHours, queues.sumOf { q -> q.sumOf { it.second } })
                    if (amount <= EPSILON) break
                    if ((used[date] ?: 0.0) + amount > capacity + EPSILON) continue // 칸을 넣으면 가용을 넘는 날은 건너뛴다
                    // 번갈아: 이번 차례 프로젝트부터, 작업이 다 끝난 프로젝트는 건너뛰고 다음 프로젝트가 남은 시간을 쓴다
                    var left = amount
                    for (i in queues.indices) {
                        val q = queues[(turn + i) % queues.size]
                        while (left > EPSILON && q.isNotEmpty()) {
                            val (key, remaining) = q.removeFirst()
                            val take = min(left, remaining)
                            days.getValue(key) += DayHours(date, round(take))
                            left -= take
                            if (remaining - take > EPSILON) q.addFirst(key to remaining - take)
                        }
                        if (left <= EPSILON) break
                    }
                    used.merge(date, amount, Double::plus)
                    turn = (turn + 1) % queues.size
                }
                monday = monday.plusWeeks(1)
            }
        }
        return days.map { (key, d) -> Placement(key, d, null, false) }
    }

    /** 선행 작업을 먼저, 그 밖엔 적힌 순서대로 */
    private fun inDependencyOrder(project: PlanProject): List<NewTask> {
        val byKey = project.tasks.associateBy { it.key }
        val ordered = LinkedHashMap<String, NewTask>()
        fun visit(t: NewTask, visiting: MutableSet<String>) {
            if (t.key in ordered || !visiting.add(t.key)) return
            t.dependsOnKey?.let(byKey::get)?.let { visit(it, visiting) }
            ordered[t.key] = t
        }
        project.tasks.forEach { visit(it, mutableSetOf()) }
        return ordered.values.toList()
    }

    /** earliest부터 날마다 남은 가용 시간만큼 넣는다. lastDay가 있으면 그날까지만(다 못 넣을 수 있다) */
    private fun fill(hours: Double, earliest: LocalDate, lastDay: LocalDate?, free: (LocalDate) -> Double): List<DayHours> {
        val days = mutableListOf<DayHours>()
        var remaining = hours
        var date = earliest
        for (offset in 0 until SEARCH_DAYS) {
            if (remaining <= EPSILON || (lastDay != null && date.isAfter(lastDay))) break
            val take = min(free(date), remaining)
            if (take > EPSILON) {
                days += DayHours(date, round(take))
                remaining -= take
            }
            date = date.plusDays(1)
        }
        // 마감 제한이 없는데 1년 안에 다 못 넣었으면 마지막 날에 얹는다
        if (lastDay == null && remaining > EPSILON) days += DayHours(date.minusDays(1), round(remaining))
        return days
    }

    /** 가용 시간 안에 넣고 남은 시간(초과분)을 가장 이른 날에 얹는다 */
    private fun compress(withinCapacity: List<DayHours>, hours: Double, earliest: LocalDate): List<DayHours> {
        val overflow = round(hours - withinCapacity.sumOf { it.hours })
        if (overflow <= EPSILON) return withinCapacity
        val first = withinCapacity.firstOrNull()
        return if (first != null && first.date == earliest) {
            listOf(first.copy(hours = round(first.hours + overflow))) + withinCapacity.drop(1)
        } else {
            listOf(DayHours(earliest, overflow)) + withinCapacity
        }
    }

    /** 5. 작업 마감일 — 프로젝트 마감에서 거꾸로. 상시 프로젝트는 없음 */
    private fun dueDates(project: PlanProject, today: LocalDate, daysNeeded: (NewTask) -> Int): Map<String, LocalDate?> {
        val deadline = project.deadline ?: return project.tasks.associate { it.key to null }
        val due = HashMap<String, LocalDate>()
        fun dueOf(t: NewTask, visiting: MutableSet<String>): LocalDate {
            due[t.key]?.let { return it }
            visiting += t.key
            var latest: LocalDate = deadline
            for (next in project.tasks.filter { it.dependsOnKey == t.key && it.key !in visiting }) {
                val candidate = dueOf(next, visiting).minusDays(daysNeeded(next).toLong())
                if (candidate.isBefore(latest)) latest = candidate
            }
            val result = if (latest.isBefore(today)) today else latest
            due[t.key] = result
            return result
        }
        return project.tasks.associate { it.key to dueOf(it, mutableSetOf()) }
    }

    private fun round(h: Double) = Math.round(h * 100) / 100.0
}
