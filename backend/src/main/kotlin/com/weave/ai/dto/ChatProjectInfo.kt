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
)
