package com.weave.schedule.domain

import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import java.time.LocalDate

// ⚠ 임시 알고리즘(규칙은 Scheduler 머리 주석) — 앱 mobile/src/lib/scheduler.test.ts와 같은 사례. 사용자 확인 후 바뀔 수 있다.
class SchedulerTest : FunSpec({
    val t = LocalDate.parse("2026-09-30")
    fun d(s: String) = LocalDate.parse(s)
    val embedded = listOf(
        NewTask("k1", 2.0, null),
        NewTask("k2", 3.0, "k1"),
        NewTask("k3", 4.0, "k2"),
        NewTask("k4", 2.0, null),
    )
    fun existing(start: LocalDate? = t, span: Int = 1, hours: Double = 1.0, done: Boolean = false) = ScheduledTask(start, span, hours, done)

    test("문서 예시: 하루 3시간 안에서 가장 이른 날에 배정하고, 작업 마감일은 프로젝트 마감에서 거꾸로 계산한다") {
        Scheduler.scheduleNewTasks(embedded, d("2026-10-09"), t, 3.0, emptyList()) shouldBe listOf(
            Placement("k1", d("2026-09-30"), 1, d("2026-10-06"), false),
            Placement("k2", d("2026-10-01"), 1, d("2026-10-07"), false),
            Placement("k3", d("2026-10-02"), 2, d("2026-10-09"), false),
            Placement("k4", d("2026-10-04"), 1, d("2026-10-09"), false),
        )
    }

    test("이미 배정된 작업이 쓴 시간을 빼고 남은 시간에만 넣는다 (여러 날 작업은 하루 몫으로 나눠 센다)") {
        val placed = Scheduler.scheduleNewTasks(listOf(NewTask("a", 2.0, null)), null, t, 3.0, listOf(existing(span = 2, hours = 4.0))).single()
        placed.scheduledDate shouldBe d("2026-10-02")
    }

    test("밀린 작업은 남은 시간 전부를 오늘 부하로 센다") {
        val placed = Scheduler.scheduleNewTasks(listOf(NewTask("a", 2.0, null)), null, t, 3.0, listOf(existing(start = d("2026-09-27"), hours = 2.0))).single()
        placed.scheduledDate shouldBe d("2026-10-01")
    }

    test("완료한 작업과 날짜가 없는 작업은 부하로 세지 않는다") {
        val placed = Scheduler.scheduleNewTasks(listOf(NewTask("a", 3.0, null)), null, t, 3.0, listOf(existing(hours = 3.0, done = true), existing(start = null, hours = 3.0))).single()
        placed.scheduledDate shouldBe t
    }

    test("선행 작업이 뒤에 적혀 있어도 선행 작업이 끝나는 날 이후에 배정한다") {
        val result = Scheduler.scheduleNewTasks(listOf(NewTask("after", 1.0, "before"), NewTask("before", 6.0, null)), null, t, 3.0, emptyList())
        result.map { Triple(it.key, it.scheduledDate, it.spanDays) } shouldBe listOf(
            Triple("after", d("2026-10-02"), 1),
            Triple("before", d("2026-09-30"), 2),
        )
    }

    test("마감이 없으면 작업 마감일은 작업이 끝나는 날이다") {
        Scheduler.scheduleNewTasks(listOf(NewTask("a", 5.0, null)), null, t, 3.0, emptyList()).single() shouldBe
            Placement("a", t, 2, d("2026-10-01"), false)
    }

    test("마감 안에 못 끝나면 late로 표시하고, 작업 마감일은 오늘보다 앞서지 않는다") {
        Scheduler.scheduleNewTasks(listOf(NewTask("a", 3.0, null), NewTask("b", 3.0, "a")), t, t, 3.0, emptyList()) shouldBe listOf(
            Placement("a", t, 1, t, false),
            Placement("b", d("2026-10-01"), 1, t, true),
        )
    }

    test("여러 날 작업의 하루 몫: 기간 안의 날만 소요 시간 ÷ 기간") {
        val task = ScheduledTask(d("2026-09-29"), 3, 3.0, false)
        Scheduler.hoursOn(task, d("2026-09-30")) shouldBe 1.0
        Scheduler.hoursOn(task, d("2026-10-02")) shouldBe 0.0
        Scheduler.endDate(task) shouldBe d("2026-10-01")
    }
})
