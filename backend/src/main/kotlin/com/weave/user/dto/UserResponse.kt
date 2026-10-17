package com.weave.user.dto

import com.weave.user.domain.User
import java.time.LocalDate

data class UserResponse(
    val id: Long,
    val email: String,
    /** 오늘 요일의 가용 시간 — 요일별로 바뀌기 전 앱을 위해 남겨 둔다(공휴일은 반영하지 않는다, 정확한 값은 일정 응답) */
    val dailyAvailableHours: Double,
    /** 요일별 가용 시간 — 월요일부터 7개, 0이면 쉬는 날(사용자 결정 2026-10-17) */
    val weeklyAvailableHours: List<Double>,
    /** 공휴일 가용 시간 — 공휴일은 요일보다 우선 */
    val holidayAvailableHours: Double,
    /** 상시 프로젝트 칸 — 주 몇 번 × 한 번에 몇 시간 */
    val standingSessionsPerWeek: Int,
    val standingSessionHours: Double,
) {
    companion object {
        fun of(user: User, today: LocalDate) = UserResponse(
            user.id!!, user.email, user.availableHoursOn(today, holiday = false), user.weeklyAvailableHours, user.holidayAvailableHours,
            user.standingSessionsPerWeek, user.standingSessionHours,
        )
    }
}
