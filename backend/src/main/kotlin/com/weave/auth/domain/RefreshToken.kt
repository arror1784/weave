package com.weave.auth.domain

import com.weave.global.domain.BaseEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import org.hibernate.annotations.SQLDelete
import org.hibernate.annotations.SQLRestriction
import java.time.Instant

/** 리프레시 토큰 — 원문 대신 해시만 저장. 쓸 때마다 교체하고, 교체된 토큰이 다시 오면 그 사용자 토큰을 전부 폐기한다(§3-3). */
@Entity
@Table(name = "refresh_tokens")
@SQLDelete(sql = "UPDATE refresh_tokens SET deleted_at = now() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
class RefreshToken(
    @Column(name = "user_id", nullable = false)
    val userId: Long,

    @Column(name = "token_hash", nullable = false)
    val tokenHash: String,

    @Column(name = "expires_at", nullable = false)
    val expiresAt: Instant,

    /** PC 웹 '로그인 상태 유지' — false면 웹 쿠키를 브라우저를 닫으면 사라지게 준다. 교체한 토큰도 이어받는다 */
    @Column(name = "remember", nullable = false)
    val remember: Boolean = true,
) : BaseEntity() {
    @Column(name = "revoked_at")
    var revokedAt: Instant? = null
        protected set

    fun revoke(now: Instant) {
        if (revokedAt == null) revokedAt = now
    }

    fun isActive(now: Instant): Boolean = revokedAt == null && now.isBefore(expiresAt)
}
