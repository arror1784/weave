package com.weave.schedule.dto

import com.weave.project.domain.Project
import java.time.LocalDate

data class ProjectBriefResponse(
    val id: Long,
    val name: String,
    val description: String,
    val deadline: LocalDate?,
    val status: String,
    val color: String,
) {
    companion object {
        fun of(p: Project) = ProjectBriefResponse(p.id!!, p.name, p.description, p.deadline, p.status, p.color)
    }
}
