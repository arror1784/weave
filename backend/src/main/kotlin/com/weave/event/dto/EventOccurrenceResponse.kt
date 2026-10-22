package com.weave.event.dto

import java.time.LocalDate

/** 일정 응답에 넣는 날짜별 개인 일정 — 오늘 화면·달력 표시용 */
data class EventOccurrenceResponse(
    val eventId: Long,
    val date: LocalDate,
    val title: String,
    /** HH:mm — 이어진 일정은 그날 부분(앞날에서 이어지면 06:00부터, 다음 날로 이어지면 06:00까지) */
    val startTime: String,
    val endTime: String,
    /** 이어진 일정이 앞날에서 이어진다(2026-10-23) — 앱은 '~12:00', 둘 다면 '하루 종일' */
    val fromPreviousDay: Boolean = false,
    /** 이어진 일정이 다음 날로 이어진다 — 앱은 '14:00~' */
    val toNextDay: Boolean = false,
)
