package com.weave.ai.dto

import com.fasterxml.jackson.annotation.JsonInclude

@JsonInclude(JsonInclude.Include.NON_NULL)
data class ProjectChatResponse(
    /** "question" — 다음 질문 / "tasks" — 작업 제안 완료 */
    val type: String,
    val message: String,
    val tasks: List<ProposedTask>? = null,
    /** AI가 가정한 것·일정이 빠듯한 작업 안내 */
    val assumptions: List<String>? = null,
)
