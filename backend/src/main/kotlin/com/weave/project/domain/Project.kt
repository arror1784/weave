package com.weave.project.domain

import com.weave.global.domain.BaseEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import org.hibernate.annotations.SQLDelete
import org.hibernate.annotations.SQLRestriction
import java.time.LocalDate

@Entity
@Table(name = "projects")
@SQLDelete(sql = "UPDATE projects SET deleted_at = now() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
class Project(
    @Column(name = "user_id", nullable = false)
    val userId: Long,

    @Column(nullable = false)
    var name: String,

    @Column(nullable = false)
    var description: String,

    /** null이면 상시 */
    var deadline: LocalDate?,

    /** 사용자가 고른 색 키 */
    @Column(nullable = false)
    var color: String,
) : BaseEntity() {
    /** 'active' | 'done' — 완료 → 진행중 되돌리기는 미정이라 막는다 */
    @Column(nullable = false)
    var status: String = ACTIVE
        protected set

    fun complete() {
        status = DONE
    }

    companion object {
        const val ACTIVE = "active"
        const val DONE = "done"
    }
}
