package com.weave.schedule.domain

import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import java.time.LocalDate

// ⚠ 임시 알고리즘(규칙은 Scheduler 머리 주석) — 사용자 결정(2026-10-01): 등록 때 오늘부터 전부 다시 배치, 마감 가까운 프로젝트 먼저.
class SchedulerTest : FunSpec({
    val t = LocalDate.parse("2026-09-30")
    fun d(s: String) = LocalDate.parse(s)
    fun project(key: String, deadline: LocalDate?, vararg tasks: NewTask, order: Int = 0) = PlanProject(key, deadline, order, tasks.toList())

    val embedded = project(
        "p1",
        d("2026-10-09"),
        NewTask("k1", 2.0, null),
        NewTask("k2", 3.0, "k1"),
        NewTask("k3", 4.0, "k2"),
        NewTask("k4", 2.0, null),
    )

    test("문서 예시: 하루 3시간 안에서 가장 이른 날에 배정하고, 작업 마감일은 프로젝트 마감에서 거꾸로 계산한다") {
        Scheduler.plan(listOf(embedded), t, 3.0) shouldBe listOf(
            Placement("k1", d("2026-09-30"), 1, d("2026-10-06"), false),
            Placement("k2", d("2026-10-01"), 1, d("2026-10-07"), false),
            Placement("k3", d("2026-10-02"), 2, d("2026-10-09"), false),
            Placement("k4", d("2026-10-04"), 1, d("2026-10-09"), false),
        )
    }

    test("마감이 가까운 프로젝트를 먼저 채운다 (나중에 등록했어도) — 마감 없는 프로젝트는 맨 뒤") {
        val later = project("late", d("2026-10-20"), NewTask("a", 3.0, null), order = 0)
        val sooner = project("soon", d("2026-10-03"), NewTask("b", 3.0, null), order = 1)
        val always = project("always", null, NewTask("c", 3.0, null), order = 2)
        Scheduler.plan(listOf(later, always, sooner), t, 3.0).associate { it.key to it.scheduledDate } shouldBe mapOf(
            "a" to d("2026-10-01"),
            "c" to d("2026-10-02"),
            "b" to d("2026-09-30"),
        )
    }

    test("마감이 같으면 먼저 등록한 프로젝트부터") {
        val first = project("first", d("2026-10-05"), NewTask("a", 3.0, null), order = 0)
        val second = project("second", d("2026-10-05"), NewTask("b", 3.0, null), order = 1)
        Scheduler.plan(listOf(second, first), t, 3.0).associate { it.key to it.scheduledDate } shouldBe mapOf("a" to t, "b" to d("2026-10-01"))
    }

    test("선행 작업이 뒤에 적혀 있어도 선행 작업이 끝나는 날 이후에 배정한다") {
        val p = project("p", null, NewTask("after", 1.0, "before"), NewTask("before", 6.0, null))
        Scheduler.plan(listOf(p), t, 3.0).map { Triple(it.key, it.scheduledDate, it.spanDays) } shouldBe listOf(
            Triple("after", d("2026-10-02"), 1),
            Triple("before", d("2026-09-30"), 2),
        )
    }

    test("선행 작업이 이미 끝났거나 이번에 배치하지 않는 작업이면(완료·밀림) 오늘부터 시작할 수 있다") {
        val p = project("p", null, NewTask("next", 1.0, "doneOrDelayed"))
        Scheduler.plan(listOf(p), t, 3.0).single().scheduledDate shouldBe t
    }

    test("마감이 없으면 작업 마감일은 작업이 끝나는 날이다") {
        Scheduler.plan(listOf(project("p", null, NewTask("a", 5.0, null))), t, 3.0).single() shouldBe Placement("a", t, 2, d("2026-10-01"), false)
    }

    test("마감 안에 못 끝나면 late로 표시하고, 작업 마감일은 오늘보다 앞서지 않는다") {
        Scheduler.plan(listOf(project("p", t, NewTask("a", 3.0, null), NewTask("b", 3.0, "a"))), t, 3.0) shouldBe listOf(
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
