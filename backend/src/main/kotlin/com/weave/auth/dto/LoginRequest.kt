package com.weave.auth.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class LoginRequest(
    @field:NotBlank(message = "이메일을 입력해 주세요.")
    @field:Size(max = 320)
    val email: String,

    @field:NotBlank(message = "비밀번호를 입력해 주세요.")
    @field:Size(max = 64)
    val password: String,
)
