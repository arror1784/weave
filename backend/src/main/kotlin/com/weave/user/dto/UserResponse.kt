package com.weave.user.dto

import com.weave.user.domain.User

data class UserResponse(
    val id: Long,
    val email: String,
    val dailyAvailableHours: Double,
    /** 상시 프로젝트 칸 — 주 몇 번 × 한 번에 몇 시간 */
    val standingSessionsPerWeek: Int,
    val standingSessionHours: Double,
) {
    companion object {
        fun of(user: User) = UserResponse(user.id!!, user.email, user.dailyAvailableHours, user.standingSessionsPerWeek, user.standingSessionHours)
    }
}
