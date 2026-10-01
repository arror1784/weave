package com.weave.ai.dto

import jakarta.validation.Valid
import jakarta.validation.constraints.Size

/** 챗봇 요청 — 서버는 대화를 저장하지 않고, 앱이 지금까지의 대화를 매번 보낸다 */
data class ProjectChatRequest(
    @field:Valid
    val project: ChatProjectInfo,

    @field:Valid
    @field:Size(max = 40, message = "대화가 너무 길어요.")
    val messages: List<ChatMessage> = emptyList(),
)
