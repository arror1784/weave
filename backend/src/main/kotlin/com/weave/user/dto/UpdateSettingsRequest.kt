package com.weave.user.dto

import jakarta.validation.constraints.DecimalMax
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min

/** 바꿀 값만 보낸다(하나 이상) — 0.5 단위·칸 시간 ≤ 하루 가용은 서비스에서 확인 */
data class UpdateSettingsRequest(
    /** 0.5~24시간 */
    @field:DecimalMin(value = "0.5", message = "0.5시간 이상으로 정해 주세요.")
    @field:DecimalMax(value = "24", message = "24시간 이하로 정해 주세요.")
    val dailyAvailableHours: Double? = null,

    /** 상시 프로젝트 칸 — 주 0~7번 */
    @field:Min(value = 0, message = "0번 이상으로 정해 주세요.")
    @field:Max(value = 7, message = "주 7번 이하로 정해 주세요.")
    val standingSessionsPerWeek: Int? = null,

    /** 상시 프로젝트 칸 — 한 번에 0.5시간~하루 가용 시간 */
    @field:DecimalMin(value = "0.5", message = "0.5시간 이상으로 정해 주세요.")
    val standingSessionHours: Double? = null,
)
