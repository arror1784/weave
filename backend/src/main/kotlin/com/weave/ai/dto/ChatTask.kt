package com.weave.ai.dto

import jakarta.validation.constraints.Size

/** 대화에 실어 보내는 작업 목록 한 줄 — AI가 제안한 목록이나 사용자가 직접 고친 목록. 선행 작업은 제목으로 */
data class ChatTask(
    @field:Size(max = 200)
    val title: String,

    @field:Size(max = 2000)
    val description: String = "",

    val estimatedHours: Double,

    @field:Size(max = 200)
    val dependsOnTitle: String? = null,

    val prerequisite: Boolean = false,
)
