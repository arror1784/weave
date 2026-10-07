package com.weave.ai.dto

import jakarta.validation.Valid
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size

/** 챗봇 요청 — 서버는 대화를 저장하지 않고, 앱이 지금까지의 대화를 매번 보낸다 */
data class ProjectChatRequest(
    @field:Valid
    val project: ChatProjectInfo,

    @field:Valid
    @field:Size(max = 40, message = "대화가 너무 길어요.")
    val messages: List<ChatMessage> = emptyList(),

    /** 등록 1단계에서 올린 첨부 — 내용을 AI에게 함께 보낸다(사용자 결정 2026-10-01) */
    @field:Size(max = 10)
    val attachmentIds: List<Long> = emptyList(),

    /** 대화 묶음 번호 — 앱이 등록(재요청) 흐름을 시작할 때 만든다. 사용 기록에서 같은 대화의 요청과 등록을 잇는다 */
    @field:Pattern(regexp = "[A-Za-z0-9_-]{1,64}", message = "대화 번호 형식이 올바르지 않아요.")
    val conversationId: String? = null,
)
