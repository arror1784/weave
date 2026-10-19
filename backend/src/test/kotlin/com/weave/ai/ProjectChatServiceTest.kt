package com.weave.ai

import com.weave.ai.dto.ChatMessage
import com.weave.ai.dto.ChatProjectInfo
import com.weave.ai.dto.ChatTask
import com.weave.ai.dto.ProjectChatRequest
import com.weave.ai.service.AttachmentContentLoader
import com.weave.ai.service.ProjectBreakdownPrompt
import com.weave.ai.service.ProjectChatService
import com.weave.client.AiAttachment
import com.weave.client.AiClient
import com.weave.client.AiResult
import com.weave.client.AiTurn
import com.weave.global.error.ApiException
import com.weave.global.time.TodayProvider
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.string.shouldNotContain
import io.kotest.matchers.collections.shouldNotContain
import io.mockk.every
import com.weave.activity.domain.ActivityType
import com.weave.activity.service.ActivityRecorder
import com.weave.global.config.WeaveProperties
import io.mockk.mockk
import io.mockk.verify
import io.mockk.slot
import tools.jackson.databind.json.JsonMapper
import java.time.Clock
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime

class ProjectChatServiceTest : FunSpec({
    val ai = mockk<AiClient>()
    val recorder = mockk<ActivityRecorder>(relaxed = true)
    val loader = mockk<AttachmentContentLoader>()
    every { loader.load(any(), any()) } returns emptyList()
    // 한국 시간 10/2 새벽 5시 — 하루가 아침 6시에 바뀌므로 '오늘'은 10/1
    val seoul = ZoneId.of("Asia/Seoul")
    val clock = Clock.fixed(ZonedDateTime.of(2026, 10, 2, 5, 0, 0, 0, seoul).toInstant(), seoul)
    val service = ProjectChatService(ai, ProjectBreakdownPrompt(), loader, JsonMapper.builder().build(), TodayProvider(clock), recorder, WeaveProperties(WeaveProperties.Jwt("test-secret")))
    val info = ChatProjectInfo("임베디드시스템 과제", "STM32 센서 수집", LocalDate.parse("2026-10-09"), deliverable = "보고서, 발표자료", progress = "회로 구성은 끝냄")
    val proposal = mapOf(
        "tasks" to listOf(
            mapOf("title" to "인터럽트 개념 학습", "description" to "NVIC·EXTI 정리", "estimatedHours" to 2, "dueDate" to "2026-10-03", "dependsOnTitle" to null, "isPrerequisiteLearning" to true),
            mapOf("title" to "설계 문서 작성", "description" to "블록도·시퀀스", "estimatedHours" to 3.2, "dueDate" to "2026-10-05", "dependsOnTitle" to "인터럽트 개념 학습", "isPrerequisiteLearning" to false),
            mapOf("title" to "발표자료 제작", "description" to "10장", "estimatedHours" to 4, "dueDate" to "2026-10-09", "dependsOnTitle" to "없는 작업", "isPrerequisiteLearning" to false),
        ),
        "assumptions" to listOf("팀원 3명으로 가정했어요"),
    )

    test("첫 요청: 기본 정보(결과물 형태·기 진행사항 포함)로 소개하고, AI가 글로 답하면 질문으로 돌려준다 — 처음엔 도구를 강제하지 않는다") {
        val turns = slot<List<AiTurn>>()
        every { ai.converse(any(), capture(turns), any()) } returns AiResult("선행 지식이 있나요? 팀원은 몇 명인가요?", null)
        val response = service.chat(1L, ProjectChatRequest(info, emptyList()))
        response.type shouldBe "question"
        response.message shouldBe "선행 지식이 있나요? 팀원은 몇 명인가요?"
        val intro = turns.captured.single().text
        intro shouldNotContain ProjectChatService.PROPOSE_NOW
        intro shouldContain "임베디드시스템 과제"
        intro shouldContain "2026-10-09"
        intro shouldContain "보고서, 발표자료"
        intro shouldContain "회로 구성은 끝냄"
        intro shouldContain "오늘 날짜: 2026-10-01"
    }

    test("마감이 없으면 상시 프로젝트라고 알린다 — '(입력 안 함)'으로 보냈더니 AI가 상시 프로젝트에도 마감을 물었다(2026-10-07 기록)") {
        val turns = slot<List<AiTurn>>()
        every { ai.converse(any(), capture(turns), any()) } returns AiResult("어떤 주기로 하나요?", null)
        service.chat(1L, ProjectChatRequest(info.copy(deadline = null), emptyList()))
        val intro = turns.captured.single().text
        intro shouldContain "마감 기한: 없음 — 상시 프로젝트(사용자가 마감 없이 계속하기로 정함)"
        intro shouldNotContain "마감 기한: (입력 안 함)"
    }

    test("작업 마감일(dueDate)은 도구에서 선택 항목 — 서버가 다시 계산하므로 AI가 안 줘도 된다(사용자 결정 2026-10-01, 2026-10-18)") {
        @Suppress("UNCHECKED_CAST")
        val item = ((ProjectChatService.PROPOSE_TASKS.inputSchema["properties"] as Map<String, Any>)["tasks"] as Map<String, Any>)["items"] as Map<String, Any>
        (item["required"] as List<*>) shouldNotContain "dueDate"
        val noDue = mapOf("tasks" to listOf(mapOf("title" to "설계 문서 작성", "description" to "블록도", "estimatedHours" to 3, "dependsOnTitle" to null, "isPrerequisiteLearning" to false)))
        every { ai.converse(any(), any(), any()) } returns AiResult("정리했어요.", noDue)
        val response = service.chat(2L, ProjectChatRequest(info, listOf(ChatMessage("assistant", "선행 지식?"), ChatMessage("user", "처음이에요"))))
        response.tasks!!.single().aiDueDate shouldBe null
    }

    test("propose_tasks 호출이 오면 작업 목록으로: key(k1…)·제목으로 찾은 선행 key·0.5 단위 시간·세부 설명·AI 마감일(참고)·가정") {
        every { ai.converse(any(), any(), any()) } returns AiResult("정리했어요.", proposal)
        val response = service.chat(2L, ProjectChatRequest(info, listOf(ChatMessage("assistant", "선행 지식?"), ChatMessage("user", "처음이에요"))))
        response.type shouldBe "tasks"
        response.message shouldBe "정리했어요."
        response.tasks!!.map { listOf(it.key, it.title, it.dependsOnKey, it.estimatedHours) } shouldBe listOf(
            listOf("k1", "인터럽트 개념 학습", null, 2.0),
            listOf("k2", "설계 문서 작성", "k1", 3.0),
            listOf("k3", "발표자료 제작", null, 4.0),
        )
        response.tasks!![0].description shouldBe "NVIC·EXTI 정리"
        response.tasks!![0].prerequisite shouldBe true
        response.tasks!![1].aiDueDate shouldBe LocalDate.parse("2026-10-05")
        response.assumptions shouldBe listOf("팀원 3명으로 가정했어요")
    }

    test("작업 제안 기록에는 선행 작업을 key 대신 제목으로, 선행 지식 여부와 함께 남긴다 — 검토 화면에서 고친 목록과 비교하려고 (2026-10-17)") {
        every { ai.converse(any(), any(), any()) } returns AiResult("정리했어요.", proposal)
        service.chat(3L, ProjectChatRequest(info, listOf(ChatMessage("assistant", "선행 지식?"), ChatMessage("user", "처음이에요"))))
        verify {
            recorder.record(
                3L, ActivityType.AI_CHAT, any(), any(),
                match {
                    it["proposedTasks"] == listOf(
                        mapOf("title" to "인터럽트 개념 학습", "estimatedHours" to 2.0, "dependsOnTitle" to null, "prerequisite" to true),
                        mapOf("title" to "설계 문서 작성", "estimatedHours" to 3.0, "dependsOnTitle" to "인터럽트 개념 학습", "prerequisite" to false),
                        mapOf("title" to "발표자료 제작", "estimatedHours" to 4.0, "dependsOnTitle" to null, "prerequisite" to false),
                    )
                },
                any(), any(),
            )
        }
    }

    test("사용자 답이 5번 쌓였는데 아직 제안이 없으면 마지막 답에 '지금 제안해 달라'를 덧붙인다 — Sonnet 5.5는 도구 강제(tool_choice)를 거절한다(2026-10-18 실제 API 400)") {
        val turns = slot<List<AiTurn>>()
        every { ai.converse(any(), capture(turns), any()) } returns AiResult("", proposal)
        val five = (1..5).flatMap { listOf(ChatMessage("assistant", "질문 $it"), ChatMessage("user", "답 $it")) }
        service.chat(3L, ProjectChatRequest(info, five)).type shouldBe "tasks"
        val last = turns.captured.last()
        last.role shouldBe "user"
        last.text shouldContain "답 5"
        last.text shouldContain ProjectChatService.PROPOSE_NOW
    }

    test("제안 뒤 수정 루프: 앞서 받은 제안과 직접 고친 목록을 글로 풀어 다시 보내고, 제안 요청은 덧붙이지 않는다") {
        val turns = slot<List<AiTurn>>()
        every { ai.converse(any(), capture(turns), any()) } returns AiResult("다시 정리했어요.", proposal)
        val proposed = listOf(ChatTask("설계 문서 작성", "블록도", 3.0, null, false))
        val edited = listOf(ChatTask("설계 문서 작성", "블록도", 2.0, null, false), ChatTask("회의록 정리", "", 1.0, "설계 문서 작성", false))
        val history = (1..5).flatMap { listOf(ChatMessage("assistant", "질문 $it"), ChatMessage("user", "답 $it")) } +
            listOf(ChatMessage("assistant", "정리했어요.", proposed), ChatMessage("user", "이렇게 고쳤어요", edited))
        service.chat(4L, ProjectChatRequest(info, history))
        val texts = turns.captured.map { it.text }
        texts.last() shouldNotContain ProjectChatService.PROPOSE_NOW
        texts[texts.size - 2] shouldContain "설계 문서 작성"
        texts.last() shouldContain "직접 수정한 작업 목록"
        texts.last() shouldContain "회의록 정리"
        texts.last() shouldContain "이렇게 고쳤어요"
    }

    test("같은 역할이 연달아 오면 하나로 합친다 (API는 번갈아 와야 한다)") {
        val turns = slot<List<AiTurn>>()
        every { ai.converse(any(), capture(turns), any()) } returns AiResult("?", null)
        service.chat(5L, ProjectChatRequest(info, listOf(ChatMessage("user", "하나"), ChatMessage("user", "둘"))))
        turns.captured.map { it.role } shouldBe listOf("user")
        turns.captured.single().text shouldContain "둘"
    }

    test("첨부 id를 함께 보내면 첫 사용자 메시지에 첨부 내용을 붙인다") {
        val turns = slot<List<AiTurn>>()
        val pdf = AiAttachment.Pdf("명세서.pdf", "JVBERi0=")
        every { loader.load(6L, listOf(11L)) } returns listOf(pdf)
        every { ai.converse(any(), capture(turns), any()) } returns AiResult("?", null)
        service.chat(6L, ProjectChatRequest(info, listOf(ChatMessage("assistant", "?"), ChatMessage("user", "답")), listOf(11L)))
        turns.captured.first().attachments shouldBe listOf(pdf)
        turns.captured.drop(1).all { it.attachments.isEmpty() } shouldBe true
    }

    test("AI 호출이 실패하거나 빈 응답이면 503(AI_UNAVAILABLE)") {
        every { ai.converse(any(), any(), any()) } throws RuntimeException("network")
        shouldThrow<ApiException> { service.chat(7L, ProjectChatRequest(info, emptyList())) }.code shouldBe "AI_UNAVAILABLE"
        every { ai.converse(any(), any(), any()) } returns AiResult("", null)
        shouldThrow<ApiException> { service.chat(7L, ProjectChatRequest(info, emptyList())) }.code shouldBe "AI_UNAVAILABLE"
    }

    test("시스템 프롬프트는 사용자가 쓴 프롬프트 문서(docs/)에서 온다") {
        val system = ProjectBreakdownPrompt().system()
        system shouldContain "propose_tasks"
        system shouldContain "6시간"
    }

    test("재요청: 이미 끝낸 작업을 소개에 알려 다시 제안하지 않게 한다 — 새 프로젝트 등록이 아니라고 밝힌다") {
        val turns = slot<List<AiTurn>>()
        every { ai.converse(any(), capture(turns), any()) } returns AiResult("남은 일정은요?", null)
        service.chat(1L, ProjectChatRequest(info.copy(completedTasks = listOf("인터럽트 개념 학습", "회로도 검토")), emptyList()))
        val intro = turns.captured.single().text
        intro shouldContain "이미 등록한 프로젝트의 남은 작업을 다시 나눌게요."
        intro shouldContain "이미 끝낸 작업: 인터럽트 개념 학습, 회로도 검토"
    }

    test("AI 호출이 실패해도 대화 번호·설정된 모델을 실패 기록에 남긴다") {
        every { ai.converse(any(), any(), any()) } throws RuntimeException("timeout")
        runCatching { service.chat(7L, ProjectChatRequest(info, emptyList(), conversationId = "c-fail")) }
        verify {
            recorder.record(7L, ActivityType.AI_CHAT_FAILED, any(), any(), match { it["conversationId"] == "c-fail" && it["model"] == "claude-sonnet-5-5" && it["error"] == "RuntimeException" }, any(), any())
        }
    }
})
