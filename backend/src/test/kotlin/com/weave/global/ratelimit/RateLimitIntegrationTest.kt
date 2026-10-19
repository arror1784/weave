package com.weave.global.ratelimit

import com.weave.TestcontainersConfiguration
import com.weave.ai.FakeAiConfiguration
import com.weave.support.ApiTestSupport
import io.kotest.core.extensions.ApplyExtension
import io.kotest.core.spec.style.FunSpec
import io.kotest.extensions.spring.SpringExtension
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.TestPropertySource
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.ResultActionsDsl
import org.springframework.test.web.servlet.post
import tools.jackson.databind.ObjectMapper
import java.util.UUID

/**
 * 요청 횟수 제한(§3-14, 사용자 결정 2026-10-19) — 로그인·가입·갱신은 접속 IP로, 로그인은 이메일로도, AI 챗봇은 사용자로 센다.
 * 테스트 프로필은 제한을 끈다(다른 통합 테스트가 같은 IP로 가입을 많이 한다) — 여기서만 작은 한도로 켠다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(
    properties = [
        "weave.rate-limit.enabled=true",
        "weave.rate-limit.login-per-ip-per-minute=3",
        "weave.rate-limit.login-per-email-per15-minutes=2",
        "weave.rate-limit.signup-per-ip-per-hour=2",
        "weave.rate-limit.refresh-per-ip-per-minute=2",
        "weave.rate-limit.chat-per-user-per-hour=2",
        "weave.rate-limit.chat-per-user-per-day=3",
    ],
)
@Import(TestcontainersConfiguration::class, FakeAiConfiguration::class)
@ApplyExtension(SpringExtension::class)
class RateLimitIntegrationTest(private val mockMvc: MockMvc, objectMapper: ObjectMapper) : FunSpec({
    val api = ApiTestSupport(mockMvc, objectMapper)
    fun email() = "r-${UUID.randomUUID()}@example.com"
    fun signup(email: String, ip: String) = mockMvc.post("/api/v1/auth/signup") {
        with { it.remoteAddr = ip; it }
        contentType = MediaType.APPLICATION_JSON
        content = api.json(mapOf("email" to email, "password" to "weave2026!"))
    }
    fun login(email: String, ip: String, path: String = "/api/v1/auth/login") = mockMvc.post(path) {
        with { it.remoteAddr = ip; it }
        contentType = MediaType.APPLICATION_JSON
        content = api.json(mapOf("email" to email, "password" to "wrong-password1!"))
    }
    fun ResultActionsDsl.rateLimited() = andExpect {
        status { isTooManyRequests() }
        header { exists("Retry-After") }
        jsonPath("$.code") { value("RATE_LIMITED") }
        jsonPath("$.message") { exists() }
    }

    test("가입은 IP당 한 시간에 정해진 횟수까지 — 다른 IP는 따로") {
        signup(email(), "10.0.0.1").andExpect { status { isCreated() } }
        signup(email(), "10.0.0.1").andExpect { status { isCreated() } }
        signup(email(), "10.0.0.1").rateLimited()
        signup(email(), "10.0.0.2").andExpect { status { isCreated() } }
    }

    test("로그인은 IP당 1분에 정해진 횟수까지 — 앱·웹 로그인을 함께 센다") {
        login(email(), "10.0.1.1").andExpect { status { isUnauthorized() } }
        login(email(), "10.0.1.1").andExpect { status { isUnauthorized() } }
        login(email(), "10.0.1.1", "/api/v1/auth/web/login").andExpect { status { isForbidden() } } // CSRF 없으면 403 — 횟수엔 들어가지 않는다
        login(email(), "10.0.1.1").andExpect { status { isUnauthorized() } }
        login(email(), "10.0.1.1").rateLimited()
    }

    test("로그인은 이메일당 15분에 정해진 횟수까지 — IP를 바꿔도 막는다") {
        val target = email()
        login(target, "10.0.2.1").andExpect { status { isUnauthorized() } }
        login(target, "10.0.2.2").andExpect { status { isUnauthorized() } }
        login(target, "10.0.2.3").rateLimited()
        login(target.uppercase(), "10.0.2.4").rateLimited() // 대소문자만 바꿔도 같은 이메일
    }

    test("토큰 갱신은 IP당 1분에 정해진 횟수까지") {
        repeat(2) {
            mockMvc.post("/api/v1/auth/refresh") {
                with { r -> r.remoteAddr = "10.0.3.1"; r }
                contentType = MediaType.APPLICATION_JSON
                content = api.json(mapOf("refreshToken" to "nope"))
            }.andExpect { status { isUnauthorized() } }
        }
        mockMvc.post("/api/v1/auth/refresh") {
            with { r -> r.remoteAddr = "10.0.3.1"; r }
            contentType = MediaType.APPLICATION_JSON
            content = api.json(mapOf("refreshToken" to "nope"))
        }.rateLimited()
    }

    test("AI 챗봇은 사용자당 한 시간·하루 횟수까지 — 다른 사용자는 따로") {
        val body = mapOf("project" to mapOf("name" to "캡스톤", "description" to "", "deadline" to null), "messages" to emptyList<Any>())
        fun chat(tokens: tools.jackson.databind.JsonNode) = mockMvc.post("/api/v1/project-chat") {
            header("Authorization", api.bearer(tokens))
            contentType = MediaType.APPLICATION_JSON
            content = api.json(body)
        }
        val me = api.read(signup(email(), "10.0.4.1").andReturn().response.contentAsString)
        chat(me).andExpect { status { isOk() } }
        chat(me).andExpect { status { isOk() } }
        chat(me).rateLimited()
        val other = api.read(signup(email(), "10.0.4.2").andReturn().response.contentAsString)
        chat(other).andExpect { status { isOk() } }
    }
})
