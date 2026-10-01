package com.weave.auth.dto

import com.weave.user.dto.UserResponse

data class TokenResponse(
    val accessToken: String,
    val refreshToken: String,
    /** 액세스 토큰 유효 시간(초) */
    val expiresIn: Long,
    val user: UserResponse,
)
