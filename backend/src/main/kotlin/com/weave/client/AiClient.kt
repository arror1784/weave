package com.weave.client

/** 대화 한 턴 — role은 "user" | "assistant". 첨부는 사용자 턴에만 붙는다 */
data class AiTurn(val role: String, val text: String, val attachments: List<AiAttachment> = emptyList())

/** AI 호출 창구. 실제 구현은 ClaudeClient 하나이고, 테스트에서는 가짜로 바꾼다. */
interface AiClient {
    /** system 프롬프트와 대화로 schema 모양의 JSON 문자열을 받는다 */
    fun complete(system: String, turns: List<AiTurn>, schema: Map<String, Any>): String
}
