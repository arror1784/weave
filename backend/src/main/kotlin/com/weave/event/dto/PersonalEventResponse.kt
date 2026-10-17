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
    val date: LocalDate?,
    /** HH:mm */
    val startTime: String,
    val endTime: String,
    val startDate: LocalDate?,
    val endDate: LocalDate?,
) {
    companion object {
        val HHMM: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm")

        fun of(e: PersonalEvent) = PersonalEventResponse(e.id!!, e.title, e.repeat, e.weekdays, e.date, e.startTime.format(HHMM), e.endTime.format(HHMM), e.startDate, e.endDate)
    }
}
