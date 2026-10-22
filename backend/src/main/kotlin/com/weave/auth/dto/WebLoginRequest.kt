package com.weave.auth.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

/** PC 웹 로그인 — 앱 로그인에 '로그인 상태 유지'를 더했다(사용자 결정 2026-10-22). 값이 없으면(예전 웹) 지금처럼 유지 */
data class WebLoginRequest(
    @field:NotBlank(message = "이메일을 입력해 주세요.")
    @field:Size(max = 320)
    val email: String,

    @field:NotBlank(message = "비밀번호를 입력해 주세요.")
    @field:Size(max = 64)
    val password: String,

    val rememberMe: Boolean = true,
) {
    fun toLogin() = LoginRequest(email, password)
}
