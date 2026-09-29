package com.weave.global.domain

import jakarta.persistence.Column
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.MappedSuperclass
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.Instant

/**
 * 모든 엔티티의 공통 부모 (§4-5). created_at 등을 엔티티에서 다시 선언하지 않는다.
 * 소프트 삭제는 각 엔티티에 다음 두 애너테이션으로 강제한다:
 *   @SQLDelete(sql = "UPDATE <테이블> SET deleted_at = now() WHERE id = ?")
 *   @SQLRestriction("deleted_at IS NULL")
 */
@MappedSuperclass
abstract class BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null
        protected set

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant? = null
        protected set

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant? = null
        protected set

    @Column(name = "deleted_at")
    var deletedAt: Instant? = null
        protected set
}
