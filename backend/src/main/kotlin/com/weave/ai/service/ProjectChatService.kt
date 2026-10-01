package com.weave.ai.service

import com.weave.ai.dto.ChatMessage
import com.weave.ai.dto.ChatProjectInfo
import com.weave.ai.dto.ChatTask
import com.weave.ai.dto.ProjectChatRequest
import com.weave.ai.dto.ProjectChatResponse
import com.weave.ai.dto.ProposedTask
import com.weave.client.AiClient
import com.weave.client.AiTool
import com.weave.client.AiTurn
import com.weave.global.error.ApiException
import com.weave.global.time.TodayProvider
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import tools.jackson.databind.ObjectMapper
import java.time.LocalDate

/**
 * 등록 2단계 AI 챗봇 — 사용자 프롬프트(docs/Weave — AI 작업 분할 시스템 프롬프트.md)대로 질문하다가
 * propose_tasks 도구로 작업 목록을 제안하고, 확정(등록 완료) 전까지 대화·직접 수정으로 다시 제안한다.
 * 서버는 대화를 저장하지 않는다(앱이 매번 전체 대화를 보낸다).
 */
@Service
class ProjectChatService(
    private val aiClient: AiClient,
    private val prompt: ProjectBreakdownPrompt,
    private val attachmentContentLoader: AttachmentContentLoader,
    private val objectMapper: ObjectMapper,
    private val todayProvider: TodayProvider,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun chat(userId: Long, request: ProjectChatRequest): ProjectChatResponse {
        // 첨부는 첫 사용자 메시지(프로젝트 소개)에 붙인다 — 대화 내내 같은 내용이라 ClaudeClient가 캐시한다
        val attachments = attachmentContentLoader.load(userId, request.attachmentIds)
        val turns = merge(listOf(AiTurn("user", introduce(request.project), attachments)) + request.messages.map(::toTurn))

        val result = try {
            aiClient.converse(prompt.system(), turns, PROPOSE_TASKS, forceTool = mustPropose(request.messages))
        } catch (e: ApiException) {
            throw e
        } catch (e: Exception) {
            // 대화 내용(개인정보 가능)은 남기지 않고 원인 종류만 남긴다(§3-16)
            log.warn("AI 호출 실패: {}", e.javaClass.simpleName)
            throw unavailable()
        }

        val input = result.toolInput
        if (input != null) {
            val tasks = toProposed(input["tasks"])
            if (tasks.isEmpty()) throw unavailable()
            val assumptions = (input["assumptions"] as? List<*>)?.mapNotNull { it?.toString()?.takeIf(String::isNotBlank) }.orEmpty()
            return ProjectChatResponse("tasks", result.text.ifBlank { "작업 목록을 정리했어요." }, tasks, assumptions)
        }
        if (result.text.isBlank()) throw unavailable()
        return ProjectChatResponse("question", result.text)
    }

    /** 프롬프트 대화 규칙 1: 최초 제안은 5턴 안에 — 사용자 답이 5번 쌓였는데 아직 제안이 없으면 도구 호출을 강제한다 */
    private fun mustPropose(messages: List<ChatMessage>): Boolean {
        val proposedAlready = messages.any { it.role == "assistant" && !it.tasks.isNullOrEmpty() }
        return !proposedAlready && messages.count { it.role == "user" } >= MAX_TURNS_BEFORE_PROPOSAL
    }

    /** 대화 시작 데이터(프롬프트의 "입력 데이터") — 비어 있는 항목은 비어 있다고 알린다 */
    private fun introduce(p: ChatProjectInfo) = buildString {
        appendLine("새 프로젝트를 등록할게요.")
        appendLine("프로젝트명: ${p.name}")
        appendLine("마감 기한: ${p.deadline ?: "(입력 안 함)"}")
        appendLine("프로젝트 설명: ${p.description.ifBlank { "(입력 안 함)" }}")
        appendLine("결과물 형태: ${p.deliverable.ifBlank { "(입력 안 함)" }}")
        appendLine("기 진행사항: ${p.progress.ifBlank { "(입력 안 함)" }}")
        append("오늘 날짜: ${todayProvider.today()}")
    }

    /** 앞서 받은 제안(assistant)·직접 고친 목록(user)은 JSON으로 풀어 대화에 다시 싣는다 — 서버가 대화를 저장하지 않으므로 */
    private fun toTurn(m: ChatMessage): AiTurn {
        val tasks = m.tasks
        if (tasks.isNullOrEmpty()) return AiTurn(m.role, m.text)
        val json = objectMapper.writeValueAsString(tasks.map(::toToolShape))
        val text = if (m.role == "assistant") {
            "${m.text}\n\n[앞서 제안한 작업 목록]\n$json".trim()
        } else {
            "[내가 직접 수정한 작업 목록 — 이대로 반영해서 다시 정리해 줘]\n$json\n\n${m.text}".trim()
        }
        return AiTurn(m.role, text)
    }

    private fun toToolShape(t: ChatTask) = mapOf(
        "title" to t.title,
        "description" to t.description,
        "estimatedHours" to t.estimatedHours,
        "dependsOnTitle" to t.dependsOnTitle,
        "isPrerequisiteLearning" to t.prerequisite,
    )

    /** Claude API는 user·assistant가 번갈아 와야 한다 — 연달아 같은 역할이면 하나로 합친다 */
    private fun merge(turns: List<AiTurn>): List<AiTurn> = turns.fold(mutableListOf()) { acc, t ->
        val last = acc.lastOrNull()
        if (last != null && last.role == t.role) {
            acc[acc.lastIndex] = last.copy(text = "${last.text}\n\n${t.text}", attachments = last.attachments + t.attachments)
        } else {
            acc += t
        }
        acc
    }

    /** propose_tasks 입력 → 앱이 쓰는 작업 목록. 선행 작업은 제목으로 찾아 key로 바꾸고, 못 찾으면 연결하지 않는다 */
    private fun toProposed(raw: Any?): List<ProposedTask> {
        val items = (raw as? List<*>)?.filterIsInstance<Map<*, *>>().orEmpty()
        val titles = items.map { it["title"]?.toString()?.trim().orEmpty() }
        return items.mapIndexed { i, item ->
            val depTitle = item["dependsOnTitle"]?.toString()?.trim()
            val dep = titles.indexOfFirst { it.isNotEmpty() && it == depTitle }.takeIf { it >= 0 && it != i }
            val hours = (item["estimatedHours"] as? Number)?.toDouble() ?: 1.0
            ProposedTask(
                key = "k${i + 1}",
                title = titles[i].take(200).ifEmpty { "작업 ${i + 1}" },
                description = item["description"]?.toString()?.trim().orEmpty().take(2000),
                estimatedHours = Math.round(hours.coerceIn(0.5, 200.0) * 2) / 2.0,
                dependsOnKey = dep?.let { "k${it + 1}" },
                prerequisite = item["isPrerequisiteLearning"] == true,
                aiDueDate = item["dueDate"]?.toString()?.let { runCatching { LocalDate.parse(it) }.getOrNull() },
            )
        }
    }

    private fun unavailable() = ApiException(HttpStatus.SERVICE_UNAVAILABLE, "AI_UNAVAILABLE", "AI가 잠시 응답하지 않아요. 다시 시도해 주세요.")

    companion object {
        /** 프롬프트 대화 규칙 1 — 최초 제안까지 사용자 답 최대 5번 */
        const val MAX_TURNS_BEFORE_PROPOSAL = 5

        /** 사용자 프롬프트 문서의 "출력 형식 (tool use)"와 같은 함수 정의 */
        val PROPOSE_TASKS = AiTool(
            name = "propose_tasks",
            description = "분할된 하위 작업 목록을 제안한다",
            inputSchema = mapOf(
                "type" to "object",
                "properties" to mapOf(
                    "tasks" to mapOf(
                        "type" to "array",
                        "items" to mapOf(
                            "type" to "object",
                            "properties" to mapOf(
                                "title" to mapOf("type" to "string", "description" to "구체적인 행동으로 표현된 작업명"),
                                "description" to mapOf("type" to "string", "description" to "작업 상세 설명 — 목표, 범위, 완료 기준 포함"),
                                "estimatedHours" to mapOf("type" to "number", "description" to "0.5 단위, 최대 6"),
                                "dueDate" to mapOf("type" to "string", "description" to "최종 마감일에서 역산한 이 작업의 마감일 (YYYY-MM-DD)"),
                                "dependsOnTitle" to mapOf("type" to listOf("string", "null"), "description" to "선행 작업의 title. 없으면 null"),
                                "isPrerequisiteLearning" to mapOf("type" to "boolean", "description" to "사전 지식 학습 작업이면 true"),
                            ),
                            "required" to listOf("title", "description", "estimatedHours", "dueDate", "dependsOnTitle", "isPrerequisiteLearning"),
                        ),
                    ),
                    "assumptions" to mapOf(
                        "type" to "array",
                        "items" to mapOf("type" to "string"),
                        "description" to "사용자가 명시하지 않아 AI가 가정한 항목들, 또는 역산 결과 일정이 타이트하거나 이미 지난 경우의 안내(있을 때만)",
                    ),
                ),
                "required" to listOf("tasks"),
            ),
        )
    }
}
