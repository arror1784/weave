package com.weave.project.dto

import jakarta.validation.constraints.Pattern

/** 바꿀 것만 보낸다. status는 "done"만 받는다(완료 → 진행중 되돌리기는 미정) */
data class UpdateProjectRequest(
    @field:Pattern(regexp = CreateProjectRequest.COLOR_PATTERN, message = "없는 색이에요.")
    val color: String? = null,

    @field:Pattern(regexp = "done", message = "완료로만 바꿀 수 있어요.")
    val status: String? = null,
)
