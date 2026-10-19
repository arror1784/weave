package com.weave.activity.dto

import jakarta.validation.Valid
import jakarta.validation.constraints.Size

/** 앱 사용 기록 묶음 (한 번에 50개까지) */
data class AppEventsRequest(
    @field:Size(max = 50, message = "한 번에 50개까지 보낼 수 있어요.")
    val events: List<@Valid AppEvent> = emptyList(),
)
