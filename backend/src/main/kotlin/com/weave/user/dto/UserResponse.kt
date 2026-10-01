package com.weave.user.dto

import com.weave.user.domain.User

data class UserResponse(
    val id: Long,
    val email: String,
    val dailyAvailableHours: Double,
) {
    companion object {
        fun of(user: User) = UserResponse(user.id!!, user.email, user.dailyAvailableHours)
    }
}
