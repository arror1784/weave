package com.weave.holiday.service

import com.weave.event.domain.PersonalEvent
import com.weave.event.dto.EventOccurrenceResponse
import com.weave.event.dto.PersonalEventResponse
import com.weave.event.repository.PersonalEventRepository
import com.weave.holiday.repository.HolidayRepository
import com.weave.user.domain.User
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

/**
 * 날짜별 가용 시간 = 요일별 7개 + 공휴일(요일보다 우선) − 그날 개인 일정 시간(겹치면 한 번만, 0 밑으로 안 내려감).
 * 사용자 결정 2026-10-17. 앱도 같은 값을 쓰도록 일정 응답에 날짜별로 넣는다(availableHoursByDate).
 */
@Service
class AvailabilityService(
    private val holidayRepository: HolidayRepository,
    private val personalEventRepository: PersonalEventRepository,
) {
    /** 배치에 쓰는 그날 가용 시간 함수 — 오늘부터 1년치 공휴일·개인 일정을 한 번에 읽어 둔다 */
    @Transactional(readOnly = true)
    fun capacityOn(user: User, today: LocalDate): (LocalDate) -> Double {
        val holidays = holidays(today, today.plusDays(PLAN_DAYS))
        val events = personalEventRepository.findByUserId(user.id!!)
        return { date -> available(user, date, date in holidays, events) }
    }

    @Transactional(readOnly = true)
    fun holidays(from: LocalDate, to: LocalDate): Set<LocalDate> = holidayRepository.findByDateBetween(from, to).map { it.date }.toSet()

    /** from~to 날짜별 가용 시간과 개인 일정(표시용) */
    @Transactional(readOnly = true)
    fun calendar(user: User, from: LocalDate, to: LocalDate): Calendar {
        val holidays = holidays(from, to)
        val events = personalEventRepository.findByUserId(user.id!!)
        val days = generateSequence(from) { it.plusDays(1) }.takeWhile { !it.isAfter(to) }.toList()
        return Calendar(
            holidays = holidays.sorted(),
            availableHoursByDate = days.associateWith { available(user, it, it in holidays, events) },
            events = days.flatMap { day ->
                events.filter { it.occursOn(day) }.sortedWith(compareBy({ it.startOffsetMinutes }, { it.id }))
                    .map { EventOccurrenceResponse(it.id!!, day, it.title, it.startTime.format(PersonalEventResponse.HHMM), it.endTime.format(PersonalEventResponse.HHMM)) }
            },
        )
    }

    data class Calendar(val holidays: List<LocalDate>, val availableHoursByDate: Map<LocalDate, Double>, val events: List<EventOccurrenceResponse>)

    private fun available(user: User, date: LocalDate, holiday: Boolean, events: List<PersonalEvent>): Double =
        maxOf(0.0, user.availableHoursOn(date, holiday) - busyHours(events.filter { it.occursOn(date) }))

    companion object {
        /** Scheduler.SEARCH_DAYS와 같다 — 1년 넘게 배치되는 일은 없다 */
        const val PLAN_DAYS = 366L

        /** 그날 개인 일정이 차지하는 시간 — 하루(6시~다음 날 6시) 흐름에서 겹치는 구간은 한 번만 센다 */
        fun busyHours(events: List<PersonalEvent>): Double {
            var total = 0
            var end: Int? = null
            for (e in events.sortedBy { it.startOffsetMinutes }) {
                val eventEnd = e.startOffsetMinutes + e.durationMinutes
                val start = if (end != null && e.startOffsetMinutes < end) end else e.startOffsetMinutes
                if (eventEnd > start) total += eventEnd - start
                if (end == null || eventEnd > end) end = eventEnd
            }
            return total / 60.0
        }
    }
}
