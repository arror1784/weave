package com.weave.user.domain

import com.weave.global.domain.BaseEntity
import com.weave.schedule.domain.StandingSlots
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import org.hibernate.annotations.SQLDelete
import org.hibernate.annotations.SQLRestriction
import java.time.LocalDate

@Entity
@Table(name = "users")
@SQLDelete(sql = "UPDATE users SET deleted_at = now() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
class User(
    /** 소문자·공백 제거한 이메일 (개인정보 — 탈퇴 시 행째 삭제) */
    @Column(nullable = false)
    var email: String,

    @Column(name = "password_hash", nullable = false)
    var passwordHash: String,


    /** 상시 프로젝트 칸 — 주 1~7번(사용자 결정 2026-10-18, 설정에서 0번은 막는다) */
    @Column(name = "standing_sessions_per_week", nullable = false)
    var standingSessionsPerWeek: Int = StandingSlots.DEFAULT.perWeek,

    /** 상시 프로젝트 칸 — 한 번에 0.5시간~가장 긴 요일의 가용 시간 */
    @Column(name = "standing_session_hours", nullable = false)
    var standingSessionHours: Double = StandingSlots.DEFAULT.hours,
) : BaseEntity() {
    /** 요일별 가용 시간(사용자 결정 2026-10-17) — 0이면 쉬는 날 */
    @Column(name = "available_mon", nullable = false) private var availableMon: Double = DEFAULT_DAILY_HOURS
    @Column(name = "available_tue", nullable = false) private var availableTue: Double = DEFAULT_DAILY_HOURS
    @Column(name = "available_wed", nullable = false) private var availableWed: Double = DEFAULT_DAILY_HOURS
    @Column(name = "available_thu", nullable = false) private var availableThu: Double = DEFAULT_DAILY_HOURS
    @Column(name = "available_fri", nullable = false) private var availableFri: Double = DEFAULT_DAILY_HOURS
    @Column(name = "available_sat", nullable = false) private var availableSat: Double = DEFAULT_DAILY_HOURS
    @Column(name = "available_sun", nullable = false) private var availableSun: Double = DEFAULT_DAILY_HOURS

    /** 공휴일 가용 시간 — 공휴일은 요일보다 우선한다. 처음엔 일요일과 같다 */
    @Column(name = "available_holiday", nullable = false)
    var holidayAvailableHours: Double = DEFAULT_DAILY_HOURS

    /** 월요일부터 7개 */
    var weeklyAvailableHours: List<Double>
        get() = listOf(availableMon, availableTue, availableWed, availableThu, availableFri, availableSat, availableSun)
        set(value) {
            require(value.size == 7) { "요일별 가용 시간은 7개" }
            availableMon = value[0]; availableTue = value[1]; availableWed = value[2]; availableThu = value[3]
            availableFri = value[4]; availableSat = value[5]; availableSun = value[6]
        }

    /** 그날 가용 시간 — 공휴일이면 공휴일 값, 아니면 요일 값 */
    fun availableHoursOn(date: LocalDate, holiday: Boolean): Double = if (holiday) holidayAvailableHours else weeklyAvailableHours[date.dayOfWeek.value - 1]

    /** 상시 칸 시간 상한 — 가장 긴 요일(공휴일 포함) */
    fun longestAvailableHours(): Double = (weeklyAvailableHours + holidayAvailableHours).max()

    fun standingSlots() = StandingSlots(standingSessionsPerWeek, standingSessionHours)

    companion object {
        const val DEFAULT_DAILY_HOURS = 3.0
    }
}
