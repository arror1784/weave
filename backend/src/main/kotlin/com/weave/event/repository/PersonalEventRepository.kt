package com.weave.event.repository

import com.weave.event.domain.PersonalEvent
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query

interface PersonalEventRepository : JpaRepository<PersonalEvent, Long> {
    fun findByUserIdOrderById(userId: Long, pageable: Pageable): Page<PersonalEvent>

    fun findByUserId(userId: Long): List<PersonalEvent>

    fun findByIdAndUserId(id: Long, userId: Long): PersonalEvent?

    /** 탈퇴 시 실제 삭제(§3-17) */
    @Modifying
    @Query(value = "DELETE FROM personal_events WHERE user_id = :userId", nativeQuery = true)
    fun hardDeleteByUserId(userId: Long)
}
