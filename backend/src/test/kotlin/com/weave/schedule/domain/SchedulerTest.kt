package com.weave.schedule.domain

import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import java.time.LocalDate

// ⚠ 임시 알고리즘(규칙은 Scheduler 머리 주석) — 사용자 결정(2026-10-01): 등록 때 오늘부터 전부 다시 배치, 마감 가까운 순,
//   하루에 최대한 채워 앞당기기, 상시 프로젝트 작업은 마감일 없음, 마감을 넘기면 초과분을 가장 이른 날에 얹어 마감 지키기.
//   (2026-10-17) 상시 프로젝트는 맨 뒤가 아니라 떼어 둔 칸(주 n번 × n시간)에만.
class SchedulerTest : FunSpec({
    val t = LocalDate.parse("2026-09-30")
    fun d(s: String) = LocalDate.parse(s)
    fun project(key: String, deadline: LocalDate?, vararg tasks: NewTask, order: Int = 0) = PlanProject(key, deadline, order, tasks.toList())
    fun days(vararg pairs: Pair<String, Double>) = pairs.map { DayHours(d(it.first), it.second) }
    val far = d("2026-12-31")

    val embedded = project(
        "p1",
        d("2026-10-09"),
        NewTask("k1", 2.0, null),
        NewTask("k2", 3.0, "k1"),
        NewTask("k3", 4.0, "k2"),
        NewTask("k4", 2.0, null),
    )

    test("하루에 최대한 채워 앞당긴다 — 남은 시간이 있으면 그날부터 쓰고, 작업 마감일은 프로젝트 마감에서 거꾸로 계산한다") {
        Scheduler.plan(listOf(embedded), t, 3.0) shouldBe listOf(
            Placement("k1", days("2026-09-30" to 2.0), d("2026-10-06"), false),
            Placement("k2", days("2026-09-30" to 1.0, "2026-10-01" to 2.0), d("2026-10-07"), false),
            Placement("k3", days("2026-10-01" to 1.0, "2026-10-02" to 3.0), d("2026-10-09"), false),
            Placement("k4", days("2026-10-03" to 2.0), d("2026-10-09"), false),
        )
    }

    test("하루 가용보다 큰 작업은 하루를 꽉 채우고 나머지를 다음 날에 (4시간·하루 3시간 → 3 + 1)") {
        Scheduler.plan(listOf(project("p", far, NewTask("a", 4.0, null))), t, 3.0).single().days shouldBe days("2026-09-30" to 3.0, "2026-10-01" to 1.0)
    }

    test("시작일·기간은 배정된 날로 정해진다") {
        val p = Scheduler.plan(listOf(project("p", far, NewTask("a", 7.0, null))), t, 3.0).single()
        p.scheduledDate shouldBe t
        p.spanDays shouldBe 3
    }

    test("마감이 가까운 프로젝트를 먼저 채운다 (나중에 등록했어도)") {
        val later = project("late", d("2026-10-20"), NewTask("a", 3.0, null), order = 0)
        val sooner = project("soon", d("2026-10-03"), NewTask("b", 3.0, null), order = 1)
        Scheduler.plan(listOf(later, sooner), t, 3.0).associate { it.key to it.scheduledDate } shouldBe mapOf(
            "a" to d("2026-10-01"),
            "b" to d("2026-09-30"),
        )
    }

    test("마감이 같으면 먼저 등록한 프로젝트부터") {
        val first = project("first", d("2026-10-05"), NewTask("a", 3.0, null), order = 0)
        val second = project("second", d("2026-10-05"), NewTask("b", 3.0, null), order = 1)
        Scheduler.plan(listOf(second, first), t, 3.0).associate { it.key to it.scheduledDate } shouldBe mapOf("a" to t, "b" to d("2026-10-01"))
    }

    test("선행 작업이 뒤에 적혀 있어도 선행 작업이 끝나는 날부터 배정한다") {
        val p = project("p", far, NewTask("after", 1.0, "before"), NewTask("before", 6.0, null))
        Scheduler.plan(listOf(p), t, 3.0).associate { it.key to it.days } shouldBe mapOf(
            "after" to days("2026-10-02" to 1.0),
            "before" to days("2026-09-30" to 3.0, "2026-10-01" to 3.0),
        )
    }

    test("선행 작업이 이번 배치에 없으면(완료·밀림) 오늘부터") {
        Scheduler.plan(listOf(project("p", far, NewTask("next", 1.0, "gone"))), t, 3.0).single().scheduledDate shouldBe t
    }

    // ── 상시(마감 없는) 프로젝트 — 사용자 결정 2026-10-17 ──
    //   떼어 둔 칸에만 넣는다(기본 주 2번 × 1시간). 주는 월~일, 마감 작업을 배치한 뒤 그 주에서 가장 한가한 날(같으면 이른 날),
    //   하루에 한 칸까지, 이번 주에 남은 날이 적으면 남은 날 수만큼만, 그 칸을 넣으면 가용 시간을 넘는 날은 건너뛴다.
    //   상시 프로젝트가 여럿이면 칸을 번갈아 쓰고, 칸보다 긴 작업은 여러 칸에 나눠 넣는다. 작업 마감일은 없다.
    //   t(9/30)는 수요일 — 이번 주에 남은 날은 9/30~10/4 닷새.

    test("상시 작업은 주 2번 1시간 칸에만 들어가고 마감일이 없다 — 한가한 날이 같으면 이른 날") {
        Scheduler.plan(listOf(project("p", null, NewTask("a", 3.0, null))), t, 3.0).single() shouldBe
            Placement("a", days("2026-09-30" to 1.0, "2026-10-01" to 1.0, "2026-10-05" to 1.0), null, false)
    }

    test("마감 작업을 먼저 배치하고, 그 주에서 가장 한가한 날에 상시 칸을 넣는다") {
        val deadline = project("d", d("2026-10-02"), NewTask("x", 6.0, null), order = 0)
        val always = project("s", null, NewTask("a", 2.0, null), order = 1)
        Scheduler.plan(listOf(deadline, always), t, 3.0) shouldBe listOf(
            Placement("x", days("2026-09-30" to 3.0, "2026-10-01" to 3.0), d("2026-10-02"), false),
            Placement("a", days("2026-10-02" to 1.0, "2026-10-03" to 1.0), null, false),
        )
    }

    test("가장 한가한 날에 넣어도 가용 시간을 넘으면 그 칸은 건너뛴다 — 다음 주로") {
        val full = project("d", d("2026-10-04"), NewTask("x", 15.0, null), order = 0) // 9/30~10/4 매일 3h
        val always = project("s", null, NewTask("a", 1.0, null), order = 1)
        Scheduler.plan(listOf(full, always), t, 3.0).last() shouldBe Placement("a", days("2026-10-05" to 1.0), null, false)
    }

    test("이번 주에 남은 날이 적으면 남은 날 수만큼만 (일요일이면 1번)") {
        val sunday = d("2026-10-04")
        Scheduler.plan(listOf(project("p", null, NewTask("a", 4.0, null))), sunday, 3.0).single().days shouldBe
            days("2026-10-04" to 1.0, "2026-10-05" to 1.0, "2026-10-06" to 1.0, "2026-10-12" to 1.0)
    }

    test("주 횟수·칸 시간은 설정을 따른다 — 0번이면 상시 작업을 배치하지 않는다") {
        Scheduler.plan(listOf(project("p", null, NewTask("a", 3.0, null))), t, 3.0, StandingSlots(1, 2.0)).single().days shouldBe
            days("2026-09-30" to 2.0, "2026-10-05" to 1.0)
        val none = Scheduler.plan(listOf(project("p", null, NewTask("a", 3.0, null))), t, 3.0, StandingSlots(0, 1.0)).single()
        none.days shouldBe emptyList()
        none.scheduledDate shouldBe null
    }

    test("상시 프로젝트가 여럿이면 칸을 번갈아 쓴다 (먼저 등록한 프로젝트부터)") {
        val a = project("A", null, NewTask("a", 2.0, null), order = 0)
        val b = project("B", null, NewTask("b", 2.0, null), order = 1)
        Scheduler.plan(listOf(b, a), t, 3.0).associate { it.key to it.days } shouldBe mapOf(
            "a" to days("2026-09-30" to 1.0, "2026-10-05" to 1.0),
            "b" to days("2026-10-01" to 1.0, "2026-10-06" to 1.0),
        )
    }

    test("칸에 남는 시간은 같은 프로젝트의 다음 작업이 쓰고, 프로젝트 작업이 다 끝나면 다음 상시 프로젝트가 쓴다") {
        val a = project("A", null, NewTask("a1", 0.5, null), NewTask("a2", 1.0, "a1"), order = 0)
        Scheduler.plan(listOf(a), t, 3.0).associate { it.key to it.days } shouldBe mapOf(
            "a1" to days("2026-09-30" to 0.5),
            "a2" to days("2026-09-30" to 0.5, "2026-10-01" to 0.5),
        )
        val short = project("A", null, NewTask("x", 0.5, null), order = 0)
        val b = project("B", null, NewTask("y", 1.0, null), order = 1)
        Scheduler.plan(listOf(short, b), t, 3.0).associate { it.key to it.days } shouldBe mapOf(
            "x" to days("2026-09-30" to 0.5),
            "y" to days("2026-09-30" to 0.5, "2026-10-01" to 0.5),
        )
    }

    test("상시 프로젝트 안에서도 선행 작업을 먼저 넣는다") {
        val p = project("p", null, NewTask("after", 1.0, "before"), NewTask("before", 1.0, null))
        Scheduler.plan(listOf(p), t, 3.0).associate { it.key to it.days } shouldBe mapOf(
            "after" to days("2026-10-01" to 1.0),
            "before" to days("2026-09-30" to 1.0),
        )
    }

    test("칸 시간이 하루 가용보다 크면 하루 가용만큼만 쓴다") {
        Scheduler.plan(listOf(project("p", null, NewTask("a", 3.0, null))), t, 2.0, StandingSlots(1, 4.0)).single().days shouldBe
            days("2026-09-30" to 2.0, "2026-10-05" to 1.0)
    }

    test("가용 시간 안에서 마감을 못 지키면 과부하가 걸려도 마감을 지킨다 — 초과분은 가장 이른 날에 얹고 '빠듯함'으로 표시") {
        // 마감 오늘: a 3h는 오늘 꽉 채우고, b 3h는 원래 내일이지만 오늘에 얹는다(오늘 6h) → b는 빠듯함(late=true)
        Scheduler.plan(listOf(project("p", t, NewTask("a", 3.0, null), NewTask("b", 3.0, "a"))), t, 3.0) shouldBe listOf(
            Placement("a", days("2026-09-30" to 3.0), t, false),
            Placement("b", days("2026-09-30" to 3.0), t, true),
        )
        // 마감 내일·5h: 가용 안에 들어가면(3 + 2) 압축하지 않는다
        Scheduler.plan(listOf(project("q", d("2026-10-01"), NewTask("a", 5.0, null))), t, 3.0).single() shouldBe
            Placement("a", days("2026-09-30" to 3.0, "2026-10-01" to 2.0), d("2026-10-01"), false)
        // 마감 오늘·5h: 오늘 3h + 초과 2h를 오늘에 → 오늘 5h
        Scheduler.plan(listOf(project("r", t, NewTask("a", 5.0, null))), t, 3.0).single() shouldBe
            Placement("a", days("2026-09-30" to 5.0), t, true)
    }

    test("하루 몫: 날짜별 배정 시간이 있으면 그대로 쓴다") {
        val task = ScheduledTask(d("2026-09-29"), 3, 5.0, false, days("2026-09-29" to 3.0, "2026-10-01" to 2.0))
        Scheduler.hoursOn(task, d("2026-09-29")) shouldBe 3.0
        Scheduler.hoursOn(task, d("2026-09-30")) shouldBe 0.0
        Scheduler.hoursOn(task, d("2026-10-01")) shouldBe 2.0
        Scheduler.endDate(task) shouldBe d("2026-10-01")
    }

    test("하루 몫: 날짜별 배정이 없는 옛 작업은 기간에 똑같이 나눈다") {
        val task = ScheduledTask(d("2026-09-29"), 3, 3.0, false)
        Scheduler.hoursOn(task, d("2026-09-30")) shouldBe 1.0
    }
})
