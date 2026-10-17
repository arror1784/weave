package com.weave.holiday.service

import com.weave.holiday.repository.HolidayRepository
import com.weave.user.domain.User
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

/** 날짜별 가용 시간 — 요일별 7개 + 공휴일(요일보다 우선, 사용자 결정 2026-10-17) */
@Service
class AvailabilityService(private val holidayRepository: HolidayRepository) {

    /** 배치에 쓰는 그날 가용 시간 함수 — 오늘부터 1년치 공휴일을 한 번에 읽어 둔다 */
    @Transactional(readOnly = true)
    fun capacityOn(user: User, today: LocalDate): (LocalDate) -> Double {
        val holidays = holidays(today, today.plusDays(PLAN_DAYS))
        return { date -> user.availableHoursOn(date, date in holidays) }
    }

    @Transactional(readOnly = true)
    fun holidays(from: LocalDate, to: LocalDate): Set<LocalDate> = holidayRepository.findByDateBetween(from, to).map { it.date }.toSet()

    companion object {
        /** Scheduler.SEARCH_DAYS와 같다 — 1년 넘게 배치되는 일은 없다 */
        const val PLAN_DAYS = 366L
    }
}
