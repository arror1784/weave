package com.weave.ai.service

import com.weave.ai.dto.ChatProjectInfo
import com.weave.ai.dto.ProjectChatRequest
import com.weave.ai.dto.ProjectChatResponse
import com.weave.ai.dto.ProposedTask
import com.weave.client.AiClient
import com.weave.client.AiTurn
import com.weave.global.config.WeaveProperties
import com.weave.global.error.ApiException
import com.weave.global.security.RateLimiter
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import tools.jackson.databind.ObjectMapper

/**
 * 등록 2단계 AI 챗봇 — 질문을 이어가다 작업을 제안한다. 서버는 대화를 저장하지 않는다(앱이 매번 전체 대화를 보낸다).
 * 프롬프트는 임시(ProjectBreakdownPrompt).
 */
@Service
class ProjectChatService(
    private val aiClient: AiClient,
    private val prompt: ProjectBreakdownPrompt,
    private val rateLimiter: RateLimiter,
    private val properties: WeaveProperties,
    private val objectMapper: ObjectMapper,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    private data class AiReply(val type: String, val message: String, val tasks: List<AiTask> = emptyList())
    private data class AiTask(val title: String, val estimatedHours: Double, val dependsOnIndex: Int = -1, val prerequisite: Boolean = false)

    fun chat(userId: Long, request: ProjectChatRequest): ProjectChatResponse {
        val limits = properties.rateLimit
        rateLimiter.check("ai:user:$userId", limits.aiPerUser, limits.aiWindow)

        val turns = listOf(AiTurn("user", introduce(request.project))) + request.messages.map { AiTurn(it.role, it.text) }
        val reply = try {
            objectMapper.readValue(aiClient.complete(prompt.system(), turns, SCHEMA), AiReply::class.java)
        } catch (e: ApiException) {
            throw e
        } catch (e: Exception) {
            // 대화 내용(개인정보 가능)은 남기지 않고 원인 종류만 남긴다(§3-16)
            log.warn("AI 호출 실패: {}", e.javaClass.simpleName)
            throw unavailable()
        }

        val questionNumber = request.messages.count { it.role == "assistant" } + 1
        return when (reply.type) {
            "question" -> ProjectChatResponse("question", reply.message, questionNumber, TOTAL_QUESTIONS)
            "tasks" -> ProjectChatResponse("tasks", reply.message, questionNumber, TOTAL_QUESTIONS, toProposed(reply.tasks))
            else -> throw unavailable()
        }
    }

    private fun introduce(p: ChatProjectInfo) = buildString {
        appendLine("새 프로젝트를 등록할게요.")
        appendLine("프로젝트명: ${p.name}")
        appendLine("마감일: ${p.deadline ?: "없음(상시)"}")
        if (p.description.isNotBlank()) appendLine("설명·목표: ${p.description}")
    }.trim()

    /** 번호 기반 선행 연결을 key(k1, k2…)로. 범위를 벗어나거나 자기 자신이면 연결하지 않는다. */
    private fun toProposed(tasks: List<AiTask>): List<ProposedTask> {
        if (tasks.isEmpty()) throw unavailable()
        return tasks.mapIndexed { i, t ->
            val dep = t.dependsOnIndex.takeIf { it in tasks.indices && it != i }?.let { "k${it + 1}" }
            ProposedTask("k${i + 1}", t.title.take(200), (Math.round(t.estimatedHours.coerceIn(0.5, 200.0) * 2) / 2.0), dep, t.prerequisite)
        }
    }

    private fun unavailable() = ApiException(HttpStatus.SERVICE_UNAVAILABLE, "AI_UNAVAILABLE", "AI가 잠시 응답하지 않아요. 다시 시도해 주세요.")

    companion object {
        /** 진행 표시의 전체 질문 수 — Figma 디자인(질문 n/5) */
        const val TOTAL_QUESTIONS = 5

        /** AI 응답 JSON 모양(구조화 출력) */
        val SCHEMA: Map<String, Any> = mapOf(
            "type" to "object",
            "properties" to mapOf(
                "type" to mapOf("type" to "string", "enum" to listOf("question", "tasks")),
                "message" to mapOf("type" to "string"),
                "tasks" to mapOf(
                    "type" to "array",
                    "items" to mapOf(
                        "type" to "object",
                        "properties" to mapOf(
                            "title" to mapOf("type" to "string"),
                            "estimatedHours" to mapOf("type" to "number"),
                            "dependsOnIndex" to mapOf("type" to "integer"),
                            "prerequisite" to mapOf("type" to "boolean"),
                        ),
                        "required" to listOf("title", "estimatedHours", "dependsOnIndex", "prerequisite"),
                        "additionalProperties" to false,
                    ),
                ),
            ),
            "required" to listOf("type", "message", "tasks"),
            "additionalProperties" to false,
        )
    }
}
