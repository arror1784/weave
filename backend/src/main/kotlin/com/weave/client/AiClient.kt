package com.weave.client

/** 대화 한 턴 — role은 "user" | "assistant". 첨부는 사용자 턴에만 붙는다 */
data class AiTurn(val role: String, val text: String, val attachments: List<AiAttachment> = emptyList())

/** AI가 부를 수 있는 함수(tool use) — 구조화된 결과를 받는 창구 */
data class AiTool(val name: String, val description: String, val inputSchema: Map<String, Any>)

/** AI 응답: 글(text)과, 도구를 불렀다면 그 입력(toolInput). 토큰 사용량은 사용 기록용(모르면 null) */
data class AiResult(val text: String, val toolInput: Map<String, Any?>?, val inputTokens: Long? = null, val outputTokens: Long? = null)

/** AI 호출 창구. 실제 구현은 ClaudeClient 하나이고, 테스트에서는 가짜로 바꾼다. */
interface AiClient {
    /** forceTool이면 반드시 tool을 부르게 한다 */
    fun converse(system: String, turns: List<AiTurn>, tool: AiTool, forceTool: Boolean): AiResult
}
