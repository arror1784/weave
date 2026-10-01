package com.weave.project.domain

import com.weave.global.domain.BaseEntity
import com.weave.schedule.domain.ScheduledTask
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import org.hibernate.annotations.SQLDelete
import org.hibernate.annotations.SQLRestriction
import java.time.LocalDate

/** 작업 — 등록한 뒤에는 완료 여부만 바뀐다(사용자 결정 B, 바뀔 수 있음). 날짜는 일정 알고리즘이 정한다. */
@Entity
@Table(name = "tasks")
@SQLDelete(sql = "UPDATE tasks SET deleted_at = now() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
class Task(
    @Column(name = "project_id", nullable = false)
    val projectId: Long,

    @Column(nullable = false)
    val position: Int,

    @Column(nullable = false)
    val title: String,

    @Column(name = "estimated_hours")
    val estimatedHours: Double?,

    @Column(name = "scheduled_date")
    val scheduledDate: LocalDate?,

    @Column(name = "span_days", nullable = false)
    val spanDays: Int,

    @Column(name = "due_date")
    val dueDate: LocalDate?,

    @Column(nullable = false)
    val prerequisite: Boolean,
) : BaseEntity() {
    /** 선행 작업 id — 저장 후에야 id가 생기므로 등록 시 두 번에 나눠 잇는다 */
    @Column(name = "depends_on_id")
    var dependsOnId: Long? = null

    @Column(nullable = false)
    var done: Boolean = false

    fun toScheduled() = ScheduledTask(scheduledDate, spanDays, estimatedHours, done)
}
