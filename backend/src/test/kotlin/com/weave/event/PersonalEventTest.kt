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
        AvailabilityService.busyHoursOn(sat, listOf(e)) shouldBe 2.0
    }

    test("6시 이후에 시작하면 입력한 날 그대로") {
        once(sat, "06:00", "07:00").occursOn(sat) shouldBe true
        once(sat, "05:59", "07:00").occursOn(sat) shouldBe false
    }

    test("끝이 시작보다 이르면 자정을 넘긴다 — 22:00~01:00은 3시간") {
        val e = once(sat, "22:00", "01:00")
        e.occursOn(sat) shouldBe true
        e.occursOn(sat.plusDays(1)) shouldBe false
        AvailabilityService.busyHoursOn(sat, listOf(e)) shouldBe 3.0
    }

    test("6시를 걸치는 일정은 시작한 날에서 모두 뺀다 — 05:00~07:00은 앞날 2시간") {
        val e = once(sat, "05:00", "07:00")
        e.occursOn(sat.minusDays(1)) shouldBe true
        e.occursOn(sat) shouldBe false
        AvailabilityService.busyHoursOn(sat.minusDays(1), listOf(e)) shouldBe 2.0
    }

    test("반복 일정의 요일·기간은 시작하는 날 기준 — 월요일 01:00 수업은 일요일 몫, 기간 첫날이 월요일이어도 그 전 일요일에 들어간다") {
        val mon = LocalDate.of(2026, 10, 19)
        val e = weekly(listOf(1), "01:00", "02:00", from = mon, to = mon)
        e.occursOn(mon.minusDays(1)) shouldBe true
        e.occursOn(mon) shouldBe false
        weekly(listOf(5), "22:00", "01:00").occursOn(LocalDate.of(2026, 10, 23)) shouldBe true // 금요일 밤 → 토요일 01:00
    }

    test("겹치는 시간은 하루(6시~다음 날 6시) 흐름에서 한 번만 센다 — 22:00~01:00 + 00:30~02:00 = 4시간, 23:00~01:00 + 10:00~11:00 = 3시간") {
        AvailabilityService.busyHoursOn(sat, listOf(once(sat, "22:00", "01:00"), once(sat.plusDays(1), "00:30", "02:00"))) shouldBe 4.0
        AvailabilityService.busyHoursOn(sat, listOf(once(sat, "23:00", "01:00"), once(sat, "10:00", "11:00"))) shouldBe 3.0
    }

    // 사용자 결정 2026-10-23: 한 번 일정은 날짜 여러 개(같은 시각) 또는 이어진 일정(시작 날짜·시각 ~ 끝 날짜·시각)
    fun dates(list: List<LocalDate>, start: String, end: String) =
        PersonalEvent(1, "일정", PersonalEvent.ONCE, "", list.min(), LocalTime.parse(start), LocalTime.parse(end), null, null, PersonalEvent.dateText(list))
    fun span(from: LocalDate, start: String, until: LocalDate, end: String) =
        PersonalEvent(1, "일정", PersonalEvent.ONCE, "", from, LocalTime.parse(start), LocalTime.parse(end), null, null, PersonalEvent.dateText(listOf(from)), until)

    test("날짜 지정 일정은 고른 날짜마다 같은 시각에 있다 — 고르지 않은 날엔 없다") {
        val e = dates(listOf(sat.plusDays(3), sat), "19:00", "21:00")
        e.dates shouldBe listOf(sat, sat.plusDays(3))
        e.occursOn(sat) shouldBe true
        e.occursOn(sat.plusDays(1)) shouldBe false
        e.occursOn(sat.plusDays(3)) shouldBe true
        AvailabilityService.busyHoursOn(sat.plusDays(3), listOf(e)) shouldBe 2.0
    }

    test("이어진 일정은 하루(6시~다음 날 6시)마다 겹치는 만큼 뺀다 — 토 14:00 ~ 월 12:00 = 토 16h · 일 24h · 월 6h") {
        val e = span(sat, "14:00", sat.plusDays(2), "12:00")
        e.occursOn(sat.minusDays(1)) shouldBe false
        e.segmentOn(sat) shouldBe PersonalEvent.DaySegment(8 * 60, 24 * 60, fromPreviousDay = false, toNextDay = true)
        e.segmentOn(sat.plusDays(1)) shouldBe PersonalEvent.DaySegment(0, 24 * 60, fromPreviousDay = true, toNextDay = true)
        e.segmentOn(sat.plusDays(2)) shouldBe PersonalEvent.DaySegment(0, 6 * 60, fromPreviousDay = true, toNextDay = false)
        e.occursOn(sat.plusDays(3)) shouldBe false
        AvailabilityService.busyHoursOn(sat, listOf(e)) shouldBe 16.0
        AvailabilityService.busyHoursOn(sat.plusDays(1), listOf(e)) shouldBe 24.0
        AvailabilityService.busyHoursOn(sat.plusDays(2), listOf(e)) shouldBe 6.0
    }

    test("이어진 일정도 하루는 6시에 바뀐다 — 토 03:00 ~ 토 08:00은 금요일 몫 3h + 토요일 몫 2h") {
        val e = span(sat, "03:00", sat, "08:00")
        AvailabilityService.busyHoursOn(sat.minusDays(1), listOf(e)) shouldBe 3.0
        AvailabilityService.busyHoursOn(sat, listOf(e)) shouldBe 2.0
    }

    test("이어진 일정과 다른 일정이 겹치면 한 번만 센다 — 토 14:00~월 12:00 위에 토 20:00~22:00 모임") {
        AvailabilityService.busyHoursOn(sat, listOf(span(sat, "14:00", sat.plusDays(2), "12:00"), once(sat, "20:00", "22:00"))) shouldBe 16.0
    }

    test("수정하면 종류까지 바뀐다 — 매주 반복을 이어진 일정으로") {
        val e = weekly(listOf(6), "10:00", "12:00")
        e.update("MT", PersonalEvent.ONCE, emptyList(), listOf(sat), LocalTime.parse("14:00"), LocalTime.parse("12:00"), null, null, sat.plusDays(1))
        e.title shouldBe "MT"
        e.weekdays shouldBe emptyList()
        e.isSpan shouldBe true
        AvailabilityService.busyHoursOn(sat, listOf(e)) shouldBe 16.0
        AvailabilityService.busyHoursOn(sat.plusDays(1), listOf(e)) shouldBe 6.0
    }
})
