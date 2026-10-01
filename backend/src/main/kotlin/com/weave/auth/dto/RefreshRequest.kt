package com.weave.auth.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

/** 토큰 갱신·로그아웃 요청 */
data class RefreshRequest(
    @field:NotBlank
    @field:Size(max = 200)
    val refreshToken: String,
)
