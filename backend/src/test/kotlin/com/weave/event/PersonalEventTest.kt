package com.weave.event

import com.weave.event.domain.PersonalEvent
import com.weave.holiday.service.AvailabilityService
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import java.time.LocalDate
import java.time.LocalTime

/**
 * 개인 일정이 어느 날에 속하는지(사용자 결정 2026-10-18): 하루는 아침 6시에 바뀌므로 새벽(0~6시)에 시작하는 일정은 앞날 것이다.
 * 끝 < 시작이면 자정을 넘겨 다음 날까지 · 요일·기간은 시작하는 날 기준 · 6시를 걸쳐도 시작 시각의 날에서 모두 뺀다.
 */
class PersonalEventTest : FunSpec({
    val sat = LocalDate.of(2026, 10, 17) // 토요일
    fun once(date: LocalDate, start: String, end: String) =
        PersonalEvent(1, "일정", PersonalEvent.ONCE, "", date, LocalTime.parse(start), LocalTime.parse(end), null, null)
    fun weekly(days: List<Int>, start: String, end: String, from: LocalDate? = null, to: LocalDate? = null) =
        PersonalEvent(1, "일정", PersonalEvent.WEEKLY, PersonalEvent.weekdayText(days), null, LocalTime.parse(start), LocalTime.parse(end), from, to)

    test("새벽에 시작하는 한 번 일정은 앞날에 속한다 — 10/18 01:00~03:00은 10/17의 일정") {
        val e = once(sat.plusDays(1), "01:00", "03:00")
        e.occursOn(sat) shouldBe true
        e.occursOn(sat.plusDays(1)) shouldBe false
        AvailabilityService.busyHours(listOf(e)) shouldBe 2.0
    }

    test("6시 이후에 시작하면 입력한 날 그대로") {
        once(sat, "06:00", "07:00").occursOn(sat) shouldBe true
        once(sat, "05:59", "07:00").occursOn(sat) shouldBe false
    }

    test("끝이 시작보다 이르면 자정을 넘긴다 — 22:00~01:00은 3시간") {
        val e = once(sat, "22:00", "01:00")
        e.occursOn(sat) shouldBe true
        e.occursOn(sat.plusDays(1)) shouldBe false
        AvailabilityService.busyHours(listOf(e)) shouldBe 3.0
    }

    test("6시를 걸치는 일정은 시작한 날에서 모두 뺀다 — 05:00~07:00은 앞날 2시간") {
        val e = once(sat, "05:00", "07:00")
        e.occursOn(sat.minusDays(1)) shouldBe true
        e.occursOn(sat) shouldBe false
        AvailabilityService.busyHours(listOf(e)) shouldBe 2.0
    }

    test("반복 일정의 요일·기간은 시작하는 날 기준 — 월요일 01:00 수업은 일요일 몫, 기간 첫날이 월요일이어도 그 전 일요일에 들어간다") {
        val mon = LocalDate.of(2026, 10, 19)
        val e = weekly(listOf(1), "01:00", "02:00", from = mon, to = mon)
        e.occursOn(mon.minusDays(1)) shouldBe true
        e.occursOn(mon) shouldBe false
        weekly(listOf(5), "22:00", "01:00").occursOn(LocalDate.of(2026, 10, 23)) shouldBe true // 금요일 밤 → 토요일 01:00
    }

    test("겹치는 시간은 하루(6시~다음 날 6시) 흐름에서 한 번만 센다 — 22:00~01:00 + 00:30~02:00 = 4시간, 23:00~01:00 + 10:00~11:00 = 3시간") {
        AvailabilityService.busyHours(listOf(once(sat, "22:00", "01:00"), once(sat.plusDays(1), "00:30", "02:00"))) shouldBe 4.0
        AvailabilityService.busyHours(listOf(once(sat, "23:00", "01:00"), once(sat, "10:00", "11:00"))) shouldBe 3.0
    }
})
