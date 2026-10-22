package com.weave.auth.dto

import com.fasterxml.jackson.annotation.JsonIgnore
import com.weave.user.dto.UserResponse

data class TokenResponse(
    val accessToken: String,
    val refreshToken: String,
    /** 액세스 토큰 유효 시간(초) */
    val expiresIn: Long,
    val user: UserResponse,
    /** 웹 쿠키 수명을 정하는 데만 쓴다 — 응답에는 내보내지 않는다 */
    @get:JsonIgnore
    val remember: Boolean = true,
)
