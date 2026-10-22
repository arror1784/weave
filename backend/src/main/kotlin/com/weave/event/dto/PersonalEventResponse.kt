package com.weave.event.dto

import com.weave.event.domain.PersonalEvent
import java.time.LocalDate
import java.time.format.DateTimeFormatter

data class PersonalEventResponse(
    val id: Long,
    val title: String,
    /** weekly · once */
    val repeat: String,
    /** 월요일 1 … 일요일 7 */
    val weekdays: List<Int>,
    /** 한 번 일정의 첫 날짜(이어진 일정은 시작 날짜) */
    val date: LocalDate?,
    /** 한 번 일정의 날짜들(2026-10-23) — 날짜 지정은 여럿, 이어진 일정은 시작 날짜 하나 */
    val dates: List<LocalDate>,
    /** 이어진 일정의 끝 날짜(2026-10-23) — 없으면 하루짜리 */
    val untilDate: LocalDate?,
    /** HH:mm */
    val startTime: String,
    val endTime: String,
    val startDate: LocalDate?,
    val endDate: LocalDate?,
) {
    companion object {
        val HHMM: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm")

        fun of(e: PersonalEvent) = PersonalEventResponse(
            e.id!!, e.title, e.repeat, e.weekdays, e.date, e.dates, e.untilDate, e.startTime.format(HHMM), e.endTime.format(HHMM), e.startDate, e.endDate,
        )
    }
}
