package com.weave.support

import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper

/** 통합 테스트 공통: JSON 요청·응답과 가입 후 토큰 받기 */
class ApiTestSupport(private val mockMvc: MockMvc, private val objectMapper: ObjectMapper) {

    fun json(value: Any): String = objectMapper.writeValueAsString(value)

    fun read(body: String): JsonNode = objectMapper.readTree(body)

    /** 가입하고 { accessToken, refreshToken, user } 응답을 돌려준다 */
    fun signup(email: String, password: String = "weave2026!"): JsonNode {
        val body = mockMvc.post("/api/v1/auth/signup") {
            contentType = MediaType.APPLICATION_JSON
            content = json(mapOf("email" to email, "password" to password))
        }.andReturn().response.contentAsString
        return read(body)
    }

    fun bearer(tokens: JsonNode): String = "Bearer ${tokens["accessToken"].asString()}"
}
