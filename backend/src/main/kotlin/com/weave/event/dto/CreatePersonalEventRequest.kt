package com.weave.event.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.time.LocalDate

/** 개인 일정 추가 — repeat가 weekly면 weekdays(월 1 … 일 7, 하나 이상), once면 date가 필요하다(서비스에서 확인) */
data class CreatePersonalEventRequest(
    @field:NotBlank(message = "일정 이름을 적어 주세요.")
    @field:Size(max = 100, message = "100자 이하로 적어 주세요.")
    val title: String,

    @field:Pattern(regexp = "weekly|once", message = "반복(weekly) 또는 한 번(once)으로 보내 주세요.")
    val repeat: String,

    val weekdays: List<Int> = emptyList(),

    val date: LocalDate? = null,

    @field:Pattern(regexp = TIME, message = "시각은 13:30처럼 보내 주세요.")
    val startTime: String,

    @field:Pattern(regexp = TIME, message = "시각은 13:30처럼 보내 주세요.")
    val endTime: String,

    val startDate: LocalDate? = null,

    val endDate: LocalDate? = null,
) {
    companion object {
        const val TIME = "([01][0-9]|2[0-3]):[0-5][0-9]"
    }
}
