package com.weave.ai.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size

data class ChatMessage(
    @field:Pattern(regexp = "user|assistant")
    val role: String,

    @field:NotBlank
    @field:Size(max = 2000)
    val text: String,
)
