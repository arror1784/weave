package com.weave.event.dto

import java.time.LocalDate

/** 일정 응답에 넣는 날짜별 개인 일정 — 오늘 화면·달력 표시용 */
data class EventOccurrenceResponse(
    val eventId: Long,
    val date: LocalDate,
    val title: String,
    /** HH:mm */
    val startTime: String,
    val endTime: String,
)
