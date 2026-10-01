package com.weave.project.repository

import com.weave.project.domain.Project
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query

interface ProjectRepository : JpaRepository<Project, Long> {
    /** 본인 것만 (IDOR 방지 §3-6) */
    fun findByIdAndUserId(id: Long, userId: Long): Project?

    fun findByUserIdAndStatus(userId: Long, status: String): List<Project>

    fun findByUserId(userId: Long): List<Project>

    /** 마감 가까운 순, 마감 없음(상시)은 뒤 */
    @Query(
        value = "SELECT p FROM Project p WHERE p.userId = :userId AND p.status = :status " +
            "ORDER BY CASE WHEN p.deadline IS NULL THEN 1 ELSE 0 END, p.deadline, p.id",
        countQuery = "SELECT count(p) FROM Project p WHERE p.userId = :userId AND p.status = :status",
    )
    fun findPage(userId: Long, status: String, pageable: Pageable): Page<Project>

    /** 탈퇴 시 실제 삭제(§3-17) */
    @Modifying
    @Query(value = "DELETE FROM projects WHERE user_id = :userId", nativeQuery = true)
    fun hardDeleteByUserId(userId: Long)
}
