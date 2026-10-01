package com.weave.global.config

import com.weave.TestcontainersConfiguration
import io.kotest.core.extensions.ApplyExtension
import io.kotest.core.spec.style.FunSpec
import io.kotest.extensions.spring.SpringExtension
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration::class)
@ApplyExtension(SpringExtension::class)
class SecurityConfigIntegrationTest(private val mockMvc: MockMvc) : FunSpec({

    test("헬스체크는 로그인 없이 호출할 수 있다") {
        mockMvc.get("/actuator/health").andExpect { status { isOk() } }
    }

    test("공개 목록에 없는 경로는 토큰 없이 호출하면 401을 돌려준다") {
        mockMvc.get("/api/v1/anything").andExpect { status { isUnauthorized() } }
    }

    test("API는 세션을 만들지 않는다") {
        mockMvc.get("/api/v1/anything").andExpect { header { doesNotExist("Set-Cookie") } }
    }

    test("API 문서(Swagger)는 로그인 없이 볼 수 있다") {
        mockMvc.get("/v3/api-docs").andExpect { status { isOk() } }
    }

    test("@PreAuthorize 권한이 없는 사용자는 403을 받는다") {
        mockMvc.get("/api/v1/test/admin-only") { with(user("member").roles("USER")) }
            .andExpect { status { isForbidden() } }
    }

    test("@PreAuthorize 권한이 있는 사용자는 통과한다") {
        mockMvc.get("/api/v1/test/admin-only") { with(user("admin").roles("ADMIN")) }
            .andExpect { status { isOk() } }
    }
})
