package com.weave.user.repository

import com.weave.user.domain.User
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query

interface UserRepository : JpaRepository<User, Long> {
    fun findByEmail(email: String): User?

    fun existsByEmail(email: String): Boolean

    /** 탈퇴: 소프트 삭제가 아니라 실제로 지운다(§3-17) */
    @Modifying
    @Query(value = "DELETE FROM users WHERE id = :id", nativeQuery = true)
    fun hardDelete(id: Long)
}
