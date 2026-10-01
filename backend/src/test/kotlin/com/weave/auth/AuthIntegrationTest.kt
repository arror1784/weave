package com.weave.auth

import com.weave.TestcontainersConfiguration
import com.weave.support.ApiTestSupport
import io.kotest.core.extensions.ApplyExtension
import io.kotest.core.spec.style.FunSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldNotContain
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import tools.jackson.databind.ObjectMapper
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration::class)
@ApplyExtension(SpringExtension::class)
class AuthIntegrationTest(private val mockMvc: MockMvc, objectMapper: ObjectMapper) : FunSpec({
    val api = ApiTestSupport(mockMvc, objectMapper)
    fun email() = "u-${UUID.randomUUID()}@example.com"

    test("가입하면 201과 액세스·리프레시 토큰, 사용자 정보(camelCase, id 포함, 이메일은 소문자로)를 돌려준다") {
        val email = email()
        mockMvc.post("/api/v1/auth/signup") {
            contentType = MediaType.APPLICATION_JSON
            content = api.json(mapOf("email" to email.uppercase(), "password" to "weave2026!"))
        }.andExpect {
            status { isCreated() }
            jsonPath("$.accessToken") { exists() }
            jsonPath("$.refreshToken") { exists() }
            jsonPath("$.expiresIn") { value(900) }
            jsonPath("$.user.id") { exists() }
            jsonPath("$.user.email") { value(email) }
        }
    }

    test("비밀번호 규칙(8~64자, 영문·숫자·특수문자, 공백 없음)을 어기면 400과 필드 오류를 돌려준다") {
        for (pw in listOf("ab1!", "weave2026", "weave 2026!", "a1!" + "x".repeat(62))) {
            mockMvc.post("/api/v1/auth/signup") {
                contentType = MediaType.APPLICATION_JSON
                content = api.json(mapOf("email" to email(), "password" to pw))
            }.andExpect {
                status { isBadRequest() }
                jsonPath("$.code") { value("VALIDATION_FAILED") }
                jsonPath("$.fieldErrors.password") { exists() }
            }
        }
    }

    test("이미 가입한 이메일이면 409를 돌려준다") {
        val email = email()
        api.signup(email)
        mockMvc.post("/api/v1/auth/signup") {
            contentType = MediaType.APPLICATION_JSON
            content = api.json(mapOf("email" to email, "password" to "weave2026!"))
        }.andExpect { status { isConflict() }; jsonPath("$.code") { value("EMAIL_TAKEN") } }
    }

    test("로그인: 맞으면 토큰, 틀리면 401 — 이메일이 없는지 비밀번호가 틀렸는지 구분하지 않는다") {
        val email = email()
        api.signup(email)
        mockMvc.post("/api/v1/auth/login") {
            contentType = MediaType.APPLICATION_JSON
            content = api.json(mapOf("email" to email, "password" to "weave2026!"))
        }.andExpect { status { isOk() }; jsonPath("$.accessToken") { exists() } }
        for (body in listOf(mapOf("email" to email, "password" to "wrong2026!"), mapOf("email" to email(), "password" to "weave2026!"))) {
            mockMvc.post("/api/v1/auth/login") {
                contentType = MediaType.APPLICATION_JSON
                content = api.json(body)
            }.andExpect { status { isUnauthorized() }; jsonPath("$.code") { value("INVALID_CREDENTIALS") } }
        }
    }

    test("액세스 토큰으로 내 정보를 조회한다 (기본 하루 가용 시간 3시간), 토큰이 없거나 위조면 401") {
        val tokens = api.signup(email())
        mockMvc.get("/api/v1/me") { header("Authorization", api.bearer(tokens)) }
            .andExpect { status { isOk() }; jsonPath("$.dailyAvailableHours") { value(3.0) } }
        mockMvc.get("/api/v1/me").andExpect { status { isUnauthorized() } }
        mockMvc.get("/api/v1/me") { header("Authorization", "Bearer forged.token.value") }
            .andExpect { status { isUnauthorized() } }
    }

    test("하루 가용 시간을 바꾼다 (0.5~24시간, 0.5 단위)") {
        val tokens = api.signup(email())
        mockMvc.patch("/api/v1/me/settings") {
            header("Authorization", api.bearer(tokens))
            contentType = MediaType.APPLICATION_JSON
            content = api.json(mapOf("dailyAvailableHours" to 4.5))
        }.andExpect { status { isOk() }; jsonPath("$.dailyAvailableHours") { value(4.5) } }
        mockMvc.patch("/api/v1/me/settings") {
            header("Authorization", api.bearer(tokens))
            contentType = MediaType.APPLICATION_JSON
            content = api.json(mapOf("dailyAvailableHours" to 0))
        }.andExpect { status { isBadRequest() } }
    }

    test("리프레시: 새 토큰 쌍을 받고, 이미 쓴(교체된) 토큰을 다시 쓰면 그 사용자의 토큰을 모두 폐기한다") {
        val first = api.signup(email())
        val refresh = { token: String ->
            mockMvc.post("/api/v1/auth/refresh") {
                contentType = MediaType.APPLICATION_JSON
                content = api.json(mapOf("refreshToken" to token))
            }
        }
        val secondBody = refresh(first["refreshToken"].asString()).andExpect { status { isOk() } }.andReturn().response.contentAsString
        val second = api.read(secondBody)
        second["refreshToken"].asString() shouldNotBe first["refreshToken"].asString()

        // 교체된 첫 토큰 재사용 → 401, 그리고 정상이던 두 번째 토큰도 폐기된다
        refresh(first["refreshToken"].asString()).andExpect { status { isUnauthorized() }; jsonPath("$.code") { value("REFRESH_TOKEN_REUSED") } }
        refresh(second["refreshToken"].asString()).andExpect { status { isUnauthorized() } }
    }

    test("로그아웃하면 그 리프레시 토큰은 더 쓸 수 없다") {
        val tokens = api.signup(email())
        mockMvc.post("/api/v1/auth/logout") {
            header("Authorization", api.bearer(tokens))
            contentType = MediaType.APPLICATION_JSON
            content = api.json(mapOf("refreshToken" to tokens["refreshToken"].asString()))
        }.andExpect { status { isNoContent() } }
        mockMvc.post("/api/v1/auth/refresh") {
            contentType = MediaType.APPLICATION_JSON
            content = api.json(mapOf("refreshToken" to tokens["refreshToken"].asString()))
        }.andExpect { status { isUnauthorized() } }
    }

    test("탈퇴하면 같은 이메일로 다시 가입할 수 있고, 예전 토큰은 쓸 수 없다") {
        val email = email()
        val tokens = api.signup(email)
        mockMvc.delete("/api/v1/me") { header("Authorization", api.bearer(tokens)) }.andExpect { status { isNoContent() } }
        mockMvc.get("/api/v1/me") { header("Authorization", api.bearer(tokens)) }.andExpect { status { isUnauthorized() } }
        mockMvc.post("/api/v1/auth/refresh") {
            contentType = MediaType.APPLICATION_JSON
            content = api.json(mapOf("refreshToken" to tokens["refreshToken"].asString()))
        }.andExpect { status { isUnauthorized() } }
        api.signup(email)["user"]["email"].asString() shouldBe email
    }

    test("에러 응답에 내부 정보(스택 트레이스·예외 이름)를 담지 않는다") {
        val body = mockMvc.post("/api/v1/auth/login") {
            contentType = MediaType.APPLICATION_JSON
            content = "{ not json"
        }.andExpect { status { isBadRequest() } }.andReturn().response.contentAsString
        body shouldNotContain "Exception"
        body shouldNotContain "at com."
    }

    test("같은 이메일로 로그인을 너무 많이 시도하면 429를 돌려준다") {
        val email = email()
        api.signup(email)
        repeat(10) {
            mockMvc.post("/api/v1/auth/login") {
                contentType = MediaType.APPLICATION_JSON
                content = api.json(mapOf("email" to email, "password" to "wrong2026!"))
            }
        }
        mockMvc.post("/api/v1/auth/login") {
            contentType = MediaType.APPLICATION_JSON
            content = api.json(mapOf("email" to email, "password" to "weave2026!"))
        }.andExpect { status { isTooManyRequests() }; jsonPath("$.code") { value("TOO_MANY_REQUESTS") } }
    }

    test("개발용 로그인은 local 프로필이 아니면 404") {
        mockMvc.post("/api/v1/dev/login") {
            contentType = MediaType.APPLICATION_JSON
            content = api.json(mapOf("email" to email()))
        }.andExpect { status { isNotFound() } }
    }
})
