package com.weave.global.config

import com.weave.TestcontainersConfiguration
import io.kotest.core.extensions.ApplyExtension
import io.kotest.core.spec.style.FunSpec
import io.kotest.extensions.spring.SpringExtension
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post

/** 운영(prod) 프로필 — 인터넷에 공개되므로 API 문서는 끄고, 헬스체크만 연다(배포 2026-10-19) */
@SpringBootTest
@ActiveProfiles("test", "prod")
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration::class)
@ApplyExtension(SpringExtension::class)
class ProdProfileIntegrationTest(private val mockMvc: MockMvc) : FunSpec({

    test("운영에서는 API 문서(Swagger)를 보여주지 않는다") {
        mockMvc.get("/v3/api-docs").andExpect { status { isNotFound() } }
        mockMvc.get("/swagger-ui/index.html").andExpect { status { isNotFound() } }
    }

    test("운영에서도 헬스체크는 로그인 없이 호출할 수 있다 — 배포 확인용") {
        mockMvc.get("/actuator/health").andExpect { status { isOk() } }
    }

    test("운영에서는 개발용 로그인이 없다(§3-4: local 외 프로필에서 404)") {
        mockMvc.post("/api/v1/dev/login") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"a@b.c"}"""
        }.andExpect { status { isNotFound() } }
    }
})
