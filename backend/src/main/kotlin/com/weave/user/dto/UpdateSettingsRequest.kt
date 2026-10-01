package com.weave.user.dto

import jakarta.validation.constraints.DecimalMax
import jakarta.validation.constraints.DecimalMin

data class UpdateSettingsRequest(
    /** 0.5~24시간, 0.5 단위(서비스에서 확인) */
    @field:DecimalMin(value = "0.5", message = "0.5시간 이상으로 정해 주세요.")
    @field:DecimalMax(value = "24", message = "24시간 이하로 정해 주세요.")
    val dailyAvailableHours: Double,
)
