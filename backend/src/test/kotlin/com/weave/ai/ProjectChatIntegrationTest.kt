package com.weave.ai

import com.weave.TestcontainersConfiguration
import com.weave.client.AiClient
import com.weave.client.AiResult
import com.weave.client.AiTool
import com.weave.client.AiTurn
import com.weave.support.ApiTestSupport
import io.kotest.core.extensions.ApplyExtension
import io.kotest.core.spec.style.FunSpec
import io.kotest.extensions.spring.SpringExtension
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Import
import org.springframework.context.annotation.Primary
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import tools.jackson.databind.ObjectMapper
import java.util.UUID

/** 실제 Claude API 대신 고정 응답 — 테스트는 외부로 나가지 않는다 */
@TestConfiguration(proxyBeanMethods = false)
class FakeAiConfiguration {
    @Bean
    @Primary
    fun fakeAiClient(): AiClient = object : AiClient {
        override fun converse(system: String, turns: List<AiTurn>, tool: AiTool) = AiResult("팀원은 몇 명인가요?", null)
    }
}

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration::class, FakeAiConfiguration::class)
@ApplyExtension(SpringExtension::class)
class ProjectChatIntegrationTest(private val mockMvc: MockMvc, objectMapper: ObjectMapper) : FunSpec({
    val api = ApiTestSupport(mockMvc, objectMapper)
    val body = mapOf("project" to mapOf("name" to "캡스톤", "description" to "", "deadline" to null), "messages" to emptyList<Any>())

    test("로그인한 사용자는 챗봇 질문을 받는다") {
        val tokens = api.signup("c-${UUID.randomUUID()}@example.com")
        mockMvc.post("/api/v1/project-chat") {
            header("Authorization", api.bearer(tokens))
            contentType = MediaType.APPLICATION_JSON
            content = api.json(body)
        }.andExpect {
            status { isOk() }
            jsonPath("$.type") { value("question") }
            jsonPath("$.message") { value("팀원은 몇 명인가요?") }
        }
    }

    test("토큰이 없으면 401, 대화가 너무 길면 400") {
        mockMvc.post("/api/v1/project-chat") { contentType = MediaType.APPLICATION_JSON; content = api.json(body) }
            .andExpect { status { isUnauthorized() } }
        val tokens = api.signup("c-${UUID.randomUUID()}@example.com")
        val tooLong = body + ("messages" to List(41) { mapOf("role" to "user", "text" to "a") })
        mockMvc.post("/api/v1/project-chat") {
            header("Authorization", api.bearer(tokens))
            contentType = MediaType.APPLICATION_JSON
            content = api.json(tooLong)
        }.andExpect { status { isBadRequest() } }
    }
})
