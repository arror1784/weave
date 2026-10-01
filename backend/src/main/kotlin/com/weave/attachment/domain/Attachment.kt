package com.weave.attachment.domain

import com.weave.global.domain.BaseEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import org.hibernate.annotations.SQLDelete
import org.hibernate.annotations.SQLRestriction

/** 참고자료 — 링크 또는 서버 로컬 디스크에 저장한 파일(사용자 결정: 로컬 디스크 · 10MB) */
@Entity
@Table(name = "attachments")
@SQLDelete(sql = "UPDATE attachments SET deleted_at = now() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
class Attachment(
    @Column(name = "user_id", nullable = false)
    val userId: Long,

    @Column(nullable = false)
    val kind: String,

    @Column(nullable = false)
    val name: String,

    val url: String? = null,

    @Column(name = "storage_key")
    val storageKey: String? = null,

    @Column(name = "content_type")
    val contentType: String? = null,

    @Column(name = "size_bytes")
    val sizeBytes: Long? = null,
) : BaseEntity() {
    @Column(name = "project_id")
    var projectId: Long? = null
        protected set

    fun linkTo(projectId: Long) {
        this.projectId = projectId
    }

    companion object {
        const val LINK = "link"
        const val FILE = "file"
        const val IMAGE = "image"
    }
}
