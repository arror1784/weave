package com.weave.ai.dto

import jakarta.validation.Valid
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size

data class ChatMessage(
    @field:Pattern(regexp = "user|assistant")
    val role: String,

    @field:Size(max = 2000)
    val text: String = "",

    /** assistant: 앞서 받은 작업 제안 / user: 직접 고친 작업 목록 (수정 루프) */
    @field:Valid
    @field:Size(max = 60)
    val tasks: List<ChatTask>? = null,
)
