package com.weave.event.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.time.LocalDate

/**
 * 개인 일정 추가·수정(수정도 모든 칸을 보낸다) — 서비스에서 종류별로 확인한다:
 * weekly면 weekdays(월 1 … 일 7, 하나 이상)·기간(startDate~endDate, 비우면 계속),
 * once면 dates(날짜 지정 — 하나 이상, 옛 앱은 date 하나) 또는 date + untilDate(이어진 일정 — date startTime ~ untilDate endTime). 시각은 HH:mm(분은 아무 값이나).
 */
data class CreatePersonalEventRequest(
    @field:NotBlank(message = "일정 이름을 적어 주세요.")
    @field:Size(max = 100, message = "100자 이하로 적어 주세요.")
    val title: String,

    @field:Pattern(regexp = "weekly|once", message = "반복(weekly) 또는 한 번(once)으로 보내 주세요.")
    val repeat: String,

    val weekdays: List<Int> = emptyList(),

    val date: LocalDate? = null,

    val dates: List<LocalDate> = emptyList(),

    val untilDate: LocalDate? = null,

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
