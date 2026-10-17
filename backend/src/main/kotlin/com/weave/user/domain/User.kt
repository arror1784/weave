package com.weave.user.domain

import com.weave.global.domain.BaseEntity
import com.weave.schedule.domain.StandingSlots
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import org.hibernate.annotations.SQLDelete
import org.hibernate.annotations.SQLRestriction

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

    @Column(name = "daily_available_hours", nullable = false)
    var dailyAvailableHours: Double = DEFAULT_DAILY_HOURS,

    /** 상시 프로젝트 칸 — 주 0~7번(0이면 상시 작업을 배치하지 않는다) */
    @Column(name = "standing_sessions_per_week", nullable = false)
    var standingSessionsPerWeek: Int = StandingSlots.DEFAULT.perWeek,

    /** 상시 프로젝트 칸 — 한 번에 0.5시간~하루 가용 시간 */
    @Column(name = "standing_session_hours", nullable = false)
    var standingSessionHours: Double = StandingSlots.DEFAULT.hours,
) : BaseEntity() {
    fun standingSlots() = StandingSlots(standingSessionsPerWeek, standingSessionHours)

    companion object {
        const val DEFAULT_DAILY_HOURS = 3.0
    }
}
