package com.weave.user.dto

import jakarta.validation.constraints.DecimalMax
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.Size

/** 바꿀 값만 보낸다(하나 이상) — 0.5 단위·칸 시간 ≤ 가장 긴 요일은 서비스에서 확인 */
data class UpdateSettingsRequest(
    /** 요일별로 바뀌기 전 앱용 — 보내면 7요일과 공휴일을 모두 이 값으로(0.5~24시간) */
    @field:DecimalMin(value = "0.5", message = "0.5시간 이상으로 정해 주세요.")
    @field:DecimalMax(value = "24", message = "24시간 이하로 정해 주세요.")
    val dailyAvailableHours: Double? = null,

    /** 요일별 가용 시간 — 월요일부터 7개, 0~24시간(0 = 쉬는 날). 값 범위는 서비스에서 확인(Kotlin은 목록 안 값의 검증 애너테이션을 넘기지 않는다) */
    @field:Size(min = 7, max = 7, message = "월요일부터 일요일까지 7개를 보내 주세요.")
    val weeklyAvailableHours: List<Double>? = null,

    /** 공휴일 가용 시간 — 0~24시간 */
    @field:DecimalMin(value = "0", message = "0시간 이상으로 정해 주세요.")
    @field:DecimalMax(value = "24", message = "24시간 이하로 정해 주세요.")
    val holidayAvailableHours: Double? = null,

    /** 상시 프로젝트 칸 — 주 1~7번(0번은 막는다, 사용자 결정 2026-10-18) */
    @field:Min(value = 1, message = "주 1번 이상으로 정해 주세요.")
    @field:Max(value = 7, message = "주 7번 이하로 정해 주세요.")
    val standingSessionsPerWeek: Int? = null,

    /** 상시 프로젝트 칸 — 한 번에 0.5시간~가장 긴 요일의 가용 시간 */
    @field:DecimalMin(value = "0.5", message = "0.5시간 이상으로 정해 주세요.")
    val standingSessionHours: Double? = null,
)
