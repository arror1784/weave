package com.weave.attachment.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size

data class CreateLinkRequest(
    @field:NotBlank(message = "링크 주소를 입력해 주세요.")
    @field:Size(max = 2000)
    @field:Pattern(regexp = "^https?://\\S+$", message = "https://로 시작하는 주소를 입력해 주세요.")
    val url: String,
)
