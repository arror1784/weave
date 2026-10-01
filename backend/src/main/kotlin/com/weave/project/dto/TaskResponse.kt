package com.weave.project.dto

import com.weave.project.domain.Task
import java.time.LocalDate

data class TaskResponse(
    val id: Long,
    val projectId: Long,
    val title: String,
    /** 목표·범위·완료 기준 */
    val description: String,
    val estimatedHours: Double?,
    val dependsOnId: Long?,
    val scheduledDate: LocalDate?,
    val spanDays: Int,
    val dueDate: LocalDate?,
    val done: Boolean,
    val prerequisite: Boolean,
    /** 밀려서 오늘로 옮겨진 작업의 원래 끝나는 날 — 있으면 "지연"으로 보여준다 */
    val delayedFrom: LocalDate?,
    /** 날짜별 배정 시간 — 하루 부하 계산에 쓴다. 비어 있으면 기간에 똑같이 나눈다 */
    val days: List<DayHoursResponse>,
) {
    companion object {
        fun of(t: Task) = TaskResponse(t.id!!, t.projectId, t.title, t.description, t.estimatedHours, t.dependsOnId, t.scheduledDate, t.spanDays, t.dueDate, t.done, t.prerequisite, t.delayedFrom, t.days().map { DayHoursResponse(it.date, it.hours) })
    }
}
