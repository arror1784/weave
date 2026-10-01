package com.weave.ai.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.LocalDate

/** 등록 1단계(기본 정보)에서 받은 내용 */
data class ChatProjectInfo(
    @field:NotBlank
    @field:Size(max = 100)
    val name: String,

    @field:Size(max = 2000)
    val description: String = "",

    val deadline: LocalDate? = null,

    /** 결과물 형태 (예: 보고서, 발표자료, 앱) — 비어 있으면 AI가 묻는다 */
    @field:Size(max = 500)
    val deliverable: String = "",

    /** 기 진행사항 (이미 해 둔 작업) */
    @field:Size(max = 2000)
    val progress: String = "",

    /** "AI에게 재요청"일 때 이미 끝낸 작업 제목 — 다시 제안하지 않도록 알린다. 새 등록이면 비어 있다 */
    @field:Size(max = 60)
    val completedTasks: List<@Size(max = 200) String> = emptyList(),
)
