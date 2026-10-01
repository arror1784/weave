package com.weave.auth.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class SignupRequest(
    @field:NotBlank(message = "이메일을 입력해 주세요.")
    @field:Email(message = "이메일 형식이 올바르지 않아요.")
    @field:Size(max = 320)
    val email: String,

    @field:ValidPassword
    val password: String,
)
