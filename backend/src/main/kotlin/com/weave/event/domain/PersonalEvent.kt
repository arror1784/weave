package com.weave.event.domain

import com.weave.global.domain.BaseEntity
import com.weave.global.time.TodayProvider
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

    /**
     * 그 하루(아침 6시~다음 날 6시)에 속하는지 — 새벽(0~6시)에 시작하면 앞날 것이다(사용자 결정 2026-10-18).
     * 날짜·요일·기간은 일정이 시작하는 달력 날짜 기준.
     */
    fun occursOn(day: LocalDate): Boolean {
        val startDay = if (startTime.hour < TodayProvider.DAY_STARTS_AT_HOUR) day.plusDays(1) else day
        return when (repeat) {
            ONCE -> date == startDay
            else -> startDay.dayOfWeek.value in weekdays && (startDate == null || !startDay.isBefore(startDate)) && (endDate == null || !startDay.isAfter(endDate))
        }
    }

    /** 그 하루 안에서 시작하는 분(아침 6시 = 0) */
    val startOffsetMinutes: Int get() = Math.floorMod(minuteOfDay(startTime) - DAY_START_MINUTES, MINUTES_PER_DAY)

    /** 길이(분) — 끝이 시작보다 이르면 자정을 넘겨 다음 날까지. 6시를 걸쳐도 시작한 날에 모두 넣는다 */
    val durationMinutes: Int get() = Math.floorMod(minuteOfDay(endTime) - minuteOfDay(startTime), MINUTES_PER_DAY)

    companion object {
        const val WEEKLY = "weekly"
        const val ONCE = "once"

        fun weekdayText(days: List<Int>) = days.distinct().sorted().joinToString(",")

        private const val MINUTES_PER_DAY = 24 * 60
        private const val DAY_START_MINUTES = (TodayProvider.DAY_STARTS_AT_HOUR * 60).toInt()
        private fun minuteOfDay(t: LocalTime) = t.hour * 60 + t.minute
    }
}
