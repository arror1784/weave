package com.weave.event.domain

import com.weave.global.domain.BaseEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import org.hibernate.annotations.SQLDelete
import org.hibernate.annotations.SQLRestriction
import java.time.LocalDate
import java.time.LocalTime

/** 개인 일정(수업·모임 등) — 그날 가용 시간에서 이 시간만큼 뺀다(사용자 결정 2026-10-17). 개인정보: 탈퇴 시 행째 삭제 */
@Entity
@Table(name = "personal_events")
@SQLDelete(sql = "UPDATE personal_events SET deleted_at = now() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
class PersonalEvent(
    @Column(name = "user_id", nullable = false)
    val userId: Long,

    @Column(nullable = false, length = 100)
    val title: String,

    /** WEEKLY 매주 반복 · ONCE 한 번 */
    @Column(name = "repeat_type", nullable = false, length = 10)
    val repeat: String,

    /** 반복 요일 — 월요일 1 … 일요일 7 */
    @Column(name = "weekdays", nullable = false, length = 20)
    private val weekdayText: String,

    @Column(name = "event_date")
    val date: LocalDate?,

    @Column(name = "start_time", nullable = false)
    val startTime: LocalTime,

    @Column(name = "end_time", nullable = false)
    val endTime: LocalTime,

    @Column(name = "start_date")
    val startDate: LocalDate?,

    @Column(name = "end_date")
    val endDate: LocalDate?,
) : BaseEntity() {
    val weekdays: List<Int> get() = weekdayText.split(',').mapNotNull { it.trim().toIntOrNull() }

    fun occursOn(day: LocalDate): Boolean = when (repeat) {
        ONCE -> date == day
        else -> day.dayOfWeek.value in weekdays && (startDate == null || !day.isBefore(startDate)) && (endDate == null || !day.isAfter(endDate))
    }

    companion object {
        const val WEEKLY = "weekly"
        const val ONCE = "once"

        fun weekdayText(days: List<Int>) = days.distinct().sorted().joinToString(",")
    }
}
