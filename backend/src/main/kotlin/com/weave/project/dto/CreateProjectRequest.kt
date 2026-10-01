package com.weave.project.dto

import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.time.LocalDate

/** 프로젝트 등록(POST)·재요청 확정(PUT) — 기본 정보 + 작업 검토에서 확정한 작업 + 첨부 id */
data class CreateProjectRequest(
    @field:NotBlank(message = "프로젝트명을 입력해 주세요.")
    @field:Size(max = 100)
    val name: String,

    @field:Size(max = 2000)
    val description: String = "",

    /** null이면 상시 */
    val deadline: LocalDate? = null,

    @field:Pattern(regexp = COLOR_PATTERN, message = "없는 색이에요.")
    val color: String,

    /** 결과물 형태 */
    @field:Size(max = 500)
    val deliverable: String = "",

    /** 기 진행사항 */
    @field:Size(max = 2000)
    val progress: String = "",

    @field:Valid
    @field:Size(min = 1, max = 50, message = "작업이 1개 이상 있어야 해요.")
    val tasks: List<CreateTaskRequest>,

    @field:Size(max = 10, message = "첨부는 10개까지예요.")
    val attachmentIds: List<Long> = emptyList(),
) {
    companion object {
        /** 프로젝트 색 7가지(회색은 뺐다 — 사용자 결정 2026-10-01) — 앱 src/theme/colors.ts와 같다 */
        const val COLOR_PATTERN = "teal|magenta|violet|blue|green|amber|brown"
    }
}
