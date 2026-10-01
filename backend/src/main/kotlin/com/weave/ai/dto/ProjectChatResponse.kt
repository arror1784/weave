package com.weave.ai.dto

import com.fasterxml.jackson.annotation.JsonInclude

@JsonInclude(JsonInclude.Include.NON_NULL)
data class ProjectChatResponse(
    /** "question" — 다음 질문 / "tasks" — 작업 제안 완료 */
    val type: String,
    val message: String,
    /** 몇 번째 질문인지(진행 표시) */
    val questionNumber: Int,
    val totalQuestions: Int,
    val tasks: List<ProposedTask>? = null,
)
