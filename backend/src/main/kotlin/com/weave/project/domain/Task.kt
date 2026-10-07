package com.weave.project.domain

import com.weave.global.domain.BaseEntity
import com.weave.schedule.domain.DayHours
import com.weave.schedule.domain.Placement
import com.weave.schedule.domain.ScheduledTask
import com.weave.schedule.domain.Scheduler
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import org.hibernate.annotations.SQLDelete
import org.hibernate.annotations.SQLRestriction
import java.time.Instant
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

    /** 목표·범위·완료 기준 */
    @Column(nullable = false)
    val description: String,

    @Column(name = "estimated_hours")
    val estimatedHours: Double?,

    scheduledDate: LocalDate?,
    spanDays: Int,
    dueDate: LocalDate?,

    @Column(nullable = false)
    val prerequisite: Boolean,
) : BaseEntity() {
    /** 선행 작업 id — 저장 후에야 id가 생기므로 등록 시 두 번에 나눠 잇는다 */
    @Column(name = "depends_on_id")
    var dependsOnId: Long? = null

    @Column(nullable = false)
    var done: Boolean = false
        protected set

    /** 완료한 시각 — 사용 기록용. 완료를 풀면 지운다 */
    @Column(name = "done_at")
    var doneAt: Instant? = null
        protected set

    fun markDone(done: Boolean, now: Instant) {
        if (this.done == done) return
        this.done = done
        doneAt = if (done) now else null
    }

    /** 일정 알고리즘이 정한 시작일·기간·작업 마감일 — 서버만 바꾼다 */
    @Column(name = "scheduled_date")
    var scheduledDate: LocalDate? = scheduledDate
        protected set

    @Column(name = "span_days", nullable = false)
    var spanDays: Int = spanDays
        protected set

    @Column(name = "due_date")
    var dueDate: LocalDate? = dueDate
        protected set

    /** 날짜별 배정 시간 "YYYY-MM-DD=시간;…" — 비어 있으면 기간에 똑같이 나눈다(예전 작업) */
    @Column(name = "day_hours", nullable = false)
    var dayHours: String = ""
        protected set

    /** 밀려서 오늘로 옮겨졌다면 원래 끝나는 날 (처음 밀린 날을 유지) */
    @Column(name = "delayed_from")
    var delayedFrom: LocalDate? = null
        protected set

    fun reschedule(placement: Placement) {
        scheduledDate = placement.scheduledDate
        spanDays = placement.spanDays
        dueDate = placement.dueDate
        dayHours = encode(placement.days)
    }

    fun days(): List<DayHours> = decode(dayHours)

    /** 밀린 작업을 오늘의 추가 작업으로 옮긴다 — 원래 끝나는 날을 기억해 "밀림"으로 보여준다(사용자 결정) */
    fun moveToToday(today: LocalDate) {
        delayedFrom = delayedFrom ?: Scheduler.endDate(toScheduled())
        scheduledDate = today
        spanDays = 1
        // 남은 시간 전부를 오늘 하루에 (사용자 결정 — 과부하 감수)
        dayHours = encode(listOf(DayHours(today, estimatedHours ?: 0.0)))
    }

    /** 끝나는 날이 지났는데 아직 안 끝낸 작업 */
    fun isOverdue(today: LocalDate): Boolean = !done && Scheduler.endDate(toScheduled())?.isBefore(today) == true

    fun toScheduled() = ScheduledTask(scheduledDate, spanDays, estimatedHours, done, days())

    companion object {
        fun encode(days: List<DayHours>) = days.joinToString(";") { "${it.date}=${it.hours}" }

        fun decode(raw: String): List<DayHours> = raw.split(';').filter { it.isNotBlank() }.map {
            val (date, hours) = it.split('=')
            DayHours(LocalDate.parse(date), hours.toDouble())
        }
    }
}
