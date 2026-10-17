package com.weave.auth

import com.weave.TestcontainersConfiguration
import com.weave.support.ApiTestSupport
import io.kotest.core.extensions.ApplyExtension
import io.kotest.core.spec.style.FunSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.string.shouldNotContain
import jakarta.servlet.http.Cookie
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.mock.web.MockHttpServletResponse
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import tools.jackson.databind.ObjectMapper
import java.util.UUID

/**
 * PC 웹 로그인(사용자 결정 2026-10-17): 리프레시 토큰은 httpOnly 쿠키, 액세스 토큰은 응답 본문(웹은 메모리에만).
 * 쿠키를 쓰는 웹 인증 경로(/api/v1/auth/web 아래)에만 CSRF(XSRF-TOKEN 쿠키 + X-XSRF-TOKEN 헤더)를 켠다. 앱 API는 그대로 Bearer.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration::class)
@ApplyExtension(SpringExtension::class)
class WebAuthIntegrationTest(private val mockMvc: MockMvc, objectMapper: ObjectMapper) : FunSpec({
    val api = ApiTestSupport(mockMvc, objectMapper)
    fun email() = "w-${UUID.randomUUID()}@example.com"

    /** 웹이 처음 하듯이 CSRF 토큰 쿠키를 받는다 */
    fun csrf(): Cookie {
        val response = mockMvc.get("/api/v1/auth/web/csrf").andExpect { status { isNoContent() } }.andReturn().response
        return response.getCookie("XSRF-TOKEN")!!
    }

    fun refreshCookie(response: MockHttpServletResponse): Cookie? = response.getCookie("weave_refresh")

    fun login(email: String, xsrf: Cookie = csrf()): MockHttpServletResponse =
        mockMvc.post("/api/v1/auth/web/login") {
            cookie(xsrf)
            header("X-XSRF-TOKEN", xsrf.value)
            contentType = MediaType.APPLICATION_JSON
            content = api.json(mapOf("email" to email, "password" to "weave2026!"))
        }.andReturn().response

    fun refresh(refresh: Cookie?, xsrf: Cookie = csrf()): MockHttpServletResponse =
        mockMvc.post("/api/v1/auth/web/refresh") {
            cookie(*listOfNotNull(xsrf, refresh).toTypedArray())
            header("X-XSRF-TOKEN", xsrf.value)
        }.andReturn().response

    test("로그인하면 액세스 토큰은 본문으로, 리프레시 토큰은 HttpOnly·Secure·SameSite=Strict 쿠키(웹 인증 경로에만, 30일)로 준다") {
        val email = email()
        api.signup(email)
        val response = login(email)
        response.status shouldBe 200
        val body = api.read(response.contentAsString)
        body["accessToken"].isString shouldBe true
        body["expiresIn"].asInt() shouldBe 900
        body["user"]["email"].asString() shouldBe email
        body.has("refreshToken") shouldBe false // 리프레시 토큰은 스크립트가 읽을 수 없게 쿠키로만

        val header = response.getHeaders("Set-Cookie").first { it.startsWith("weave_refresh=") }
        header shouldContain "HttpOnly"
        header shouldContain "Secure"
        header shouldContain "SameSite=Strict"
        header shouldContain "Path=/api/v1/auth/web"
        header shouldContain "Max-Age=2592000"
    }

    test("CSRF 토큰 없이 웹 로그인·갱신·로그아웃을 보내면 403") {
        val email = email()
        api.signup(email)
        for (path in listOf("/api/v1/auth/web/login", "/api/v1/auth/web/refresh", "/api/v1/auth/web/logout")) {
            mockMvc.post(path) {
                contentType = MediaType.APPLICATION_JSON
                content = api.json(mapOf("email" to email, "password" to "weave2026!"))
            }.andExpect { status { isForbidden() } }
        }
    }

    test("비밀번호가 틀리면 401이고 쿠키를 주지 않는다") {
        val email = email()
        api.signup(email)
        val xsrf = csrf()
        val response = mockMvc.post("/api/v1/auth/web/login") {
            cookie(xsrf)
            header("X-XSRF-TOKEN", xsrf.value)
            contentType = MediaType.APPLICATION_JSON
            content = api.json(mapOf("email" to email, "password" to "wrong2026!"))
        }.andReturn().response
        response.status shouldBe 401
        refreshCookie(response) shouldBe null
    }

    test("쿠키로 갱신하면 새 액세스 토큰과 새 쿠키(교체)를 주고, 이미 쓴 쿠키가 다시 오면 그 사용자의 토큰을 모두 폐기한다") {
        val email = email()
        api.signup(email)
        val first = refreshCookie(login(email))!!

        val renewed = refresh(first)
        renewed.status shouldBe 200
        api.read(renewed.contentAsString)["accessToken"].isString shouldBe true
        val second = refreshCookie(renewed)!!
        second.value shouldNotBe first.value

        refresh(first).status shouldBe 401 // 재사용
        refresh(second).status shouldBe 401 // 재사용을 감지해 전부 폐기했다
    }

    test("쿠키 없이 갱신하면 401") {
        refresh(null).status shouldBe 401
    }

    test("로그아웃하면 그 토큰을 폐기하고 쿠키를 지운다") {
        val email = email()
        api.signup(email)
        val cookie = refreshCookie(login(email))!!
        val xsrf = csrf()
        val response = mockMvc.post("/api/v1/auth/web/logout") {
            cookie(xsrf, cookie)
            header("X-XSRF-TOKEN", xsrf.value)
        }.andReturn().response
        response.status shouldBe 204
        response.getHeaders("Set-Cookie").first { it.startsWith("weave_refresh=") } shouldContain "Max-Age=0"
        refresh(cookie).status shouldBe 401
    }

    test("웹으로 받은 액세스 토큰으로 일반 API를 쓴다 — 앱 API에는 CSRF 쿠키를 붙이지 않는다") {
        val email = email()
        api.signup(email)
        val token = api.read(login(email).contentAsString)["accessToken"].asString()
        val me = mockMvc.get("/api/v1/me") { header("Authorization", "Bearer $token") }.andReturn().response
        me.status shouldBe 200
        me.getHeaders("Set-Cookie").joinToString() shouldNotContain "XSRF-TOKEN"
        // 앱 로그인은 지금처럼 CSRF 없이 본문으로 두 토큰을 받는다
        mockMvc.post("/api/v1/auth/login") {
            contentType = MediaType.APPLICATION_JSON
            content = api.json(mapOf("email" to email, "password" to "weave2026!"))
        }.andExpect { status { isOk() }; jsonPath("$.refreshToken") { exists() } }
    }
})
