package com.weave.ai

import com.weave.ai.dto.ChatMessage
import com.weave.ai.dto.ChatProjectInfo
import com.weave.ai.dto.ProjectChatRequest
import com.weave.ai.service.ProjectBreakdownPrompt
import com.weave.ai.service.ProjectChatService
import com.weave.client.AiClient
import com.weave.client.AiTurn
import com.weave.global.config.WeaveProperties
import com.weave.global.error.ApiException
import com.weave.global.security.RateLimiter
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import tools.jackson.databind.json.JsonMapper
import java.time.Clock
import java.time.LocalDate

class ProjectChatServiceTest : FunSpec({
    val ai = mockk<AiClient>()
    val properties = WeaveProperties(WeaveProperties.Jwt("x".repeat(32)), WeaveProperties.RateLimit(aiPerUser = 2))
    val service = ProjectChatService(ai, ProjectBreakdownPrompt(), RateLimiter(Clock.systemUTC()), properties, JsonMapper.builder().build())
    val info = ChatProjectInfo("임베디드시스템 과제", "STM32 센서 수집", LocalDate.parse("2026-10-09"))

    test("첫 요청: 프로젝트 기본 정보를 첫 사용자 메시지로 보내고, AI 질문을 1번째 질문으로 돌려준다") {
        val turns = slot<List<AiTurn>>()
        every { ai.complete(any(), capture(turns), any()) } returns """{"type":"question","message":"선행 지식이 있나요?","tasks":[]}"""
        val response = service.chat(1L, ProjectChatRequest(info, emptyList()))
        response.type shouldBe "question"
        response.message shouldBe "선행 지식이 있나요?"
        response.questionNumber shouldBe 1
        response.totalQuestions shouldBe 5
        turns.captured.first().role shouldBe "user"
        turns.captured.first().text shouldContain "임베디드시스템 과제"
        turns.captured.first().text shouldContain "2026-10-09"
    }

    test("대화가 이어지면 기록을 그대로 보내고, 작업 제안이 오면 key(k1…)와 선행 key로 바꿔 돌려준다") {
        val turns = slot<List<AiTurn>>()
        every { ai.complete(any(), capture(turns), any()) } returns """
            {"type":"tasks","message":"4개 작업을 만들었어요.","tasks":[
              {"title":"개념 학습","estimatedHours":2,"dependsOnIndex":-1,"prerequisite":true},
              {"title":"설계 문서","estimatedHours":3,"dependsOnIndex":0,"prerequisite":false},
              {"title":"잘못된 선행","estimatedHours":1,"dependsOnIndex":9,"prerequisite":false}
            ]}
        """.trimIndent()
        val history = listOf(ChatMessage("assistant", "선행 지식이 있나요?"), ChatMessage("user", "UART는 알아요"))
        val response = service.chat(2L, ProjectChatRequest(info, history))
        turns.captured.map { it.role } shouldBe listOf("user", "assistant", "user")
        response.type shouldBe "tasks"
        response.tasks!!.map { Triple(it.key, it.title, it.dependsOnKey) } shouldBe listOf(
            Triple("k1", "개념 학습", null),
            Triple("k2", "설계 문서", "k1"),
            Triple("k3", "잘못된 선행", null),
        )
        response.tasks!![0].prerequisite shouldBe true
    }

    test("AI 호출이 실패하거나 응답 형식이 깨지면 503(AI_UNAVAILABLE)") {
        every { ai.complete(any(), any(), any()) } throws RuntimeException("network")
        shouldThrow<ApiException> { service.chat(3L, ProjectChatRequest(info, emptyList())) }.code shouldBe "AI_UNAVAILABLE"
        every { ai.complete(any(), any(), any()) } returns "not json"
        shouldThrow<ApiException> { service.chat(3L, ProjectChatRequest(info, emptyList())) }.code shouldBe "AI_UNAVAILABLE"
    }

    test("사용자당 AI 호출 횟수를 제한한다(비용 보호)") {
        every { ai.complete(any(), any(), any()) } returns """{"type":"question","message":"?","tasks":[]}"""
        repeat(2) { service.chat(4L, ProjectChatRequest(info, emptyList())) }
        shouldThrow<ApiException> { service.chat(4L, ProjectChatRequest(info, emptyList())) }.code shouldBe "TOO_MANY_REQUESTS"
    }

    test("임시 프롬프트는 별도 파일에서 읽고, '임시'임을 밝힌다") {
        ProjectBreakdownPrompt().system() shouldContain "임시"
    }
})
