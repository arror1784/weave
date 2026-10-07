package com.weave.activity.domain

import com.weave.global.domain.BaseEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import org.hibernate.annotations.SQLDelete
import org.hibernate.annotations.SQLRestriction
import java.time.Instant

/** 사용 기록 한 줄 (사용자 결정 2026-10-07) — 무엇을 했는지(type)와 세부 내용(detail JSON) */
@Entity
@Table(name = "activity_logs")
@SQLDelete(sql = "UPDATE activity_logs SET deleted_at = now() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
class ActivityLog(
    @Column(name = "user_id", nullable = false)
    val userId: Long,

    @Column(name = "occurred_at", nullable = false)
    val occurredAt: Instant,

    @Column(nullable = false)
    val type: String,

    @Column(name = "project_id")
    val projectId: Long?,

    @Column(name = "task_id")
    val taskId: Long?,

    @Column(nullable = false)
    val detail: String,

    /** server · app · backfill */
    @Column(nullable = false)
    val source: String,
) : BaseEntity()
