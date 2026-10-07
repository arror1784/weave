package com.weave.activity.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.Instant

/** 앱이 보내는 사용 기록 한 줄 — 종류는 ActivityType 중 app=true만 받는다 */
data class AppEvent(
    @field:NotBlank
    @field:Size(max = 40)
    val type: String,

    /** 앱에서 일어난 시각 — 없거나 너무 어긋나면 서버 시각 */
    val occurredAt: Instant? = null,

    val detail: Map<String, Any?> = emptyMap(),
)
