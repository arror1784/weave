package com.weave.activity.repository

import com.weave.activity.domain.ActivityLog
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query

interface ActivityLogRepository : JpaRepository<ActivityLog, Long> {
    fun findByUserIdOrderByOccurredAtAscIdAsc(userId: Long): List<ActivityLog>

    /** 탈퇴 — 소프트 삭제가 아니라 실제로 지운다(§3-17) */
    @Modifying
    @Query(value = "DELETE FROM activity_logs WHERE user_id = :userId", nativeQuery = true)
    fun hardDeleteByUserId(userId: Long)
}
