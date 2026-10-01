package com.weave.attachment.repository

import com.weave.attachment.domain.Attachment
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query

interface AttachmentRepository : JpaRepository<Attachment, Long> {
    fun findByProjectIdOrderById(projectId: Long): List<Attachment>

    fun findByIdInAndUserId(ids: Collection<Long>, userId: Long): List<Attachment>

    fun findByUserId(userId: Long): List<Attachment>

    /** 탈퇴 시 실제 삭제(§3-17) — 파일은 서비스가 먼저 지운다 */
    @Modifying
    @Query(value = "DELETE FROM attachments WHERE user_id = :userId", nativeQuery = true)
    fun hardDeleteByUserId(userId: Long)
}
