package com.weave.project.dto

import com.weave.project.domain.Task
import java.time.LocalDate

data class TaskResponse(
    val id: Long,
    val projectId: Long,
    val title: String,
    val estimatedHours: Double?,
    val dependsOnId: Long?,
    val scheduledDate: LocalDate?,
    val spanDays: Int,
    val dueDate: LocalDate?,
    val done: Boolean,
    val prerequisite: Boolean,
) {
    companion object {
        fun of(t: Task) = TaskResponse(t.id!!, t.projectId, t.title, t.estimatedHours, t.dependsOnId, t.scheduledDate, t.spanDays, t.dueDate, t.done, t.prerequisite)
    }
}
