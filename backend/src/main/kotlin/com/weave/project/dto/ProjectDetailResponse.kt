package com.weave.project.dto

import com.weave.attachment.dto.AttachmentResponse
import com.weave.project.domain.Project
import com.weave.project.domain.Task
import java.time.LocalDate

data class ProjectDetailResponse(
    val id: Long,
    val name: String,
    val description: String,
    val deadline: LocalDate?,
    val status: String,
    val color: String,
    val deliverable: String,
    val progress: String,
    val tasks: List<TaskResponse>,
    val attachments: List<AttachmentResponse>,
) {
    companion object {
        fun of(p: Project, tasks: List<Task>, attachments: List<AttachmentResponse>) =
            ProjectDetailResponse(p.id!!, p.name, p.description, p.deadline, p.status, p.color, p.deliverable, p.progress, tasks.map(TaskResponse::of), attachments)
    }
}
