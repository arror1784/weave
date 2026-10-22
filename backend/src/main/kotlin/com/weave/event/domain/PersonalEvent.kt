package com.weave.event.domain

import com.weave.global.domain.BaseEntity
import com.weave.global.time.TodayProvider
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import org.hibernate.annotations.SQLDelete
import org.hibernate.annotations.SQLRestriction
import java.time.Duration
import java.time.LocalDate
import java.time.LocalTime

/**
 * 개인 일정(수업·모임 등) — 그날 가용 시간에서 이 시간만큼 뺀다(사용자 결정 2026-10-17). 개인정보: 탈퇴 시 행째 삭제.
 * 종류(사용자 결정 2026-10-23): 매주 반복(WEEKLY) · 날짜 지정(ONCE, 날짜 여러 개에 같은 시각) · 이어진 일정(ONCE + untilDate — date startTime ~ untilDate endTime).
 */
@Entity
@Table(name = "personal_events")
@SQLDelete(sql = "UPDATE personal_events SET deleted_at = now() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
class PersonalEvent(
    @Column(name = "user_id", nullable = false)
    val userId: Long,

    @Column(nullable = false, length = 100)
    var title: String,

    /** WEEKLY 매주 반복 · ONCE 한 번(날짜 지정·이어진 일정) */
    @Column(name = "repeat_type", nullable = false, length = 10)
    var repeat: String,

    /** 반복 요일 — 월요일 1 … 일요일 7 */
    @Column(name = "weekdays", nullable = false, length = 20)
    private var weekdayText: String,

    /** 한 번 일정의 첫 날짜(이어진 일정은 시작 날짜) */
    @Column(name = "event_date")
    var date: LocalDate?,

    @Column(name = "start_time", nullable = false)
    var startTime: LocalTime,

    @Column(name = "end_time", nullable = false)
    var endTime: LocalTime,

    @Column(name = "start_date")
    var startDate: LocalDate?,

    @Column(name = "end_date")
    var endDate: LocalDate?,

    /** 한 번 일정의 날짜들(쉼표로) — 날짜 지정 일정은 여럿, 그 밖은 date 하나 */
    @Column(name = "event_dates", nullable = false, length = 1200)
    private var dateListText: String = date?.toString() ?: "",

    /** 이어진 일정의 끝 날짜 — 있으면 date startTime ~ untilDate endTime이 하나로 이어진다 */
    @Column(name = "until_date")
    var untilDate: LocalDate? = null,
) : BaseEntity() {
    val weekdays: List<Int> get() = weekdayText.split(',').mapNotNull { it.trim().toIntOrNull() }

    val dates: List<LocalDate> get() = dateListText.split(',').filter { it.isNotBlank() }.map { LocalDate.parse(it.trim()) }.sorted()

    val isSpan: Boolean get() = repeat == ONCE && untilDate != null

    /** 모든 칸을 바꾼다 — 종류(매주 반복↔한 번)까지(사용자 결정 2026-10-23). 검증은 서비스가 먼저 한다 */
    fun update(
        title: String, repeat: String, weekdays: List<Int>, dates: List<LocalDate>, startTime: LocalTime, endTime: LocalTime,
        startDate: LocalDate?, endDate: LocalDate?, untilDate: LocalDate?,
    ) {
        this.title = title
        this.repeat = repeat
        weekdayText = weekdayText(weekdays)
        dateListText = dateText(dates)
        date = dates.minOrNull()
        this.startTime = startTime
        this.endTime = endTime
        this.startDate = startDate
        this.endDate = endDate
        this.untilDate = untilDate
    }

    /**
     * 그 하루(아침 6시~다음 날 6시)에 속하는지 — 새벽(0~6시)에 시작하면 앞날 것이다(사용자 결정 2026-10-18).
     * 날짜·요일·기간은 일정이 시작하는 달력 날짜 기준.
     */
    fun occursOn(day: LocalDate): Boolean = segmentOn(day) != null

    /** 그 하루 안에서 차지하는 구간(분, 아침 6시 = 0). 하루짜리 일정은 6시를 걸쳐도 시작한 날에 모두 넣는다(끝이 1440을 넘을 수 있다) */
    fun segmentOn(day: LocalDate): DaySegment? {
        if (isSpan) return spanSegmentOn(day)
        val startDay = if (startTime.hour < TodayProvider.DAY_STARTS_AT_HOUR) day.plusDays(1) else day
        val on = when (repeat) {
            ONCE -> startDay in dates
            else -> startDay.dayOfWeek.value in weekdays && (startDate == null || !startDay.isBefore(startDate)) && (endDate == null || !startDay.isAfter(endDate))
        }
        return if (on) DaySegment(startOffsetMinutes, startOffsetMinutes + durationMinutes, fromPreviousDay = false, toNextDay = false) else null
    }

    /** 이어진 일정은 하루(6시~다음 날 6시)마다 겹치는 만큼(사용자 결정 2026-10-23) — 중간 날은 하루 통째로 */
    private fun spanSegmentOn(day: LocalDate): DaySegment? {
        val from = date ?: return null
        val until = untilDate ?: return null
        val start = from.atTime(startTime)
        val end = until.atTime(endTime)
        val dayStart = day.atTime(TodayProvider.DAY_STARTS_AT_HOUR.toInt(), 0)
        val dayEnd = dayStart.plusDays(1)
        if (!start.isBefore(dayEnd) || !end.isAfter(dayStart)) return null
        val from6 = maxOf(start, dayStart)
        val to6 = minOf(end, dayEnd)
        return DaySegment(
            Duration.between(dayStart, from6).toMinutes().toInt(),
            Duration.between(dayStart, to6).toMinutes().toInt(),
            fromPreviousDay = start.isBefore(dayStart),
            toNextDay = end.isAfter(dayEnd),
        )
    }

    /** 그 하루 안에서 시작하는 분(아침 6시 = 0) */
    val startOffsetMinutes: Int get() = Math.floorMod(minuteOfDay(startTime) - DAY_START_MINUTES, MINUTES_PER_DAY)

    /** 길이(분) — 끝이 시작보다 이르면 자정을 넘겨 다음 날까지. 6시를 걸쳐도 시작한 날에 모두 넣는다 */
    val durationMinutes: Int get() = Math.floorMod(minuteOfDay(endTime) - minuteOfDay(startTime), MINUTES_PER_DAY)

    /** 하루 안의 구간 — 이어진 일정이 앞날에서 이어지거나(fromPreviousDay) 다음 날로 이어지면(toNextDay) 표시에 쓴다 */
    data class DaySegment(val startMinute: Int, val endMinute: Int, val fromPreviousDay: Boolean, val toNextDay: Boolean)

    companion object {
        const val WEEKLY = "weekly"
        const val ONCE = "once"

        fun weekdayText(days: List<Int>) = days.distinct().sorted().joinToString(",")

        fun dateText(dates: List<LocalDate>) = dates.distinct().sorted().joinToString(",")

        private const val MINUTES_PER_DAY = 24 * 60
        private const val DAY_START_MINUTES = (TodayProvider.DAY_STARTS_AT_HOUR * 60).toInt()
        private fun minuteOfDay(t: LocalTime) = t.hour * 60 + t.minute
    }
}
