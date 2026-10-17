package com.weave.user

import com.weave.TestcontainersConfiguration
import com.weave.support.ApiTestSupport
import io.kotest.core.extensions.ApplyExtension
import io.kotest.core.spec.style.FunSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldNotContain
import io.kotest.matchers.shouldBe
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

/**
 * 요일별·공휴일 가용 시간(사용자 결정 2026-10-17): 월~일 7개 + 공휴일(요일보다 우선), 0시간 = 쉬는 날.
 * 처음 값은 기존 하루 가용 시간을 7요일에 복사, 공휴일은 일요일과 같게. 바꾸면 밀린 작업까지 바로 다시 배치한다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration::class)
@ApplyExtension(SpringExtension::class)
class AvailabilityIntegrationTest(private val mockMvc: MockMvc, objectMapper: ObjectMapper, jdbc: JdbcTemplate) : FunSpec({
    val api = ApiTestSupport(mockMvc, objectMapper)
    val today = java.time.LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusHours(6).toLocalDate()
    fun newUser() = api.signup("v-${UUID.randomUUID()}@example.com")
    fun settings(tokens: JsonNode, body: Map<String, Any?>) = mockMvc.patch("/api/v1/me/settings") {
        header("Authorization", api.bearer(tokens))
        contentType = MediaType.APPLICATION_JSON
        content = api.json(body)
    }
    fun schedule(tokens: JsonNode) = api.read(mockMvc.get("/api/v1/schedule") { header("Authorization", api.bearer(tokens)) }.andReturn().response.contentAsString)
    fun createFar(tokens: JsonNode, hours: Double) = mockMvc.post("/api/v1/projects") {
        header("Authorization", api.bearer(tokens))
        contentType = MediaType.APPLICATION_JSON
        content = api.json(
            mapOf(
                "name" to "긴 과제", "description" to "", "deadline" to today.plusDays(60).toString(), "color" to "teal", "deliverable" to "", "progress" to "",
                "tasks" to listOf(mapOf("key" to "a", "title" to "큰 일", "description" to "", "estimatedHours" to hours, "dependsOnKey" to null, "prerequisite" to false)),
                "attachmentIds" to emptyList<Long>(),
            ),
        )
    }
    /** 월요일 0 … 일요일 6 */
    fun weekdayIndex(date: LocalDate) = date.dayOfWeek.value - 1

    test("처음 값: 기존 하루 가용 시간(3시간)을 월~일에 복사, 공휴일은 일요일과 같게") {
        val tokens = newUser()
        val me = api.read(mockMvc.get("/api/v1/me") { header("Authorization", api.bearer(tokens)) }.andReturn().response.contentAsString)
        me["weeklyAvailableHours"].toString() shouldBe "[3.0,3.0,3.0,3.0,3.0,3.0,3.0]"
        me["holidayAvailableHours"].asDouble() shouldBe 3.0
    }

    test("요일별·공휴일 가용 시간을 바꾼다 — 0시간 허용, 0.5 단위, 24시간 이하, 7개") {
        val tokens = newUser()
        settings(tokens, mapOf("weeklyAvailableHours" to listOf(3, 1, 3, 3, 2, 5, 0), "holidayAvailableHours" to 0)).andExpect {
            status { isOk() }
            jsonPath("$.weeklyAvailableHours[1]") { value(1.0) }
            jsonPath("$.weeklyAvailableHours[6]") { value(0.0) }
            jsonPath("$.holidayAvailableHours") { value(0.0) }
        }
        settings(tokens, mapOf("weeklyAvailableHours" to listOf(3, 3, 3))).andExpect { status { isBadRequest() } }
        settings(tokens, mapOf("weeklyAvailableHours" to listOf(3, 3, 3, 3, 3, 3, 24.5))).andExpect { status { isBadRequest() } }
        settings(tokens, mapOf("weeklyAvailableHours" to listOf(3, 3, 3, 3, 3, 3, 2.25))).andExpect { status { isBadRequest() } }
        settings(tokens, mapOf("holidayAvailableHours" to -1)).andExpect { status { isBadRequest() } }
    }

    test("상시 칸 시간은 가장 긴 요일(공휴일 포함) 이하 — 가장 긴 요일을 줄이면 칸 시간도 줄어든다") {
        val tokens = newUser()
        settings(tokens, mapOf("weeklyAvailableHours" to listOf(2, 2, 2, 2, 2, 4, 4))).andExpect { status { isOk() } }
        settings(tokens, mapOf("standingSessionHours" to 4.0)).andExpect { status { isOk() } }
        settings(tokens, mapOf("standingSessionHours" to 4.5)).andExpect { status { isBadRequest() } }
        settings(tokens, mapOf("weeklyAvailableHours" to listOf(2, 2, 2, 2, 2, 3, 3), "holidayAvailableHours" to 3)).andExpect {
            status { isOk() }
            jsonPath("$.standingSessionHours") { value(3.0) }
        }
    }

    test("가용 시간을 바꾸면 바로 다시 배치한다 — 오늘을 0시간으로 하면 오늘엔 작업이 없다") {
        val tokens = newUser()
        createFar(tokens, 2.0).andExpect { status { isCreated() } }
        schedule(tokens)["tasks"][0]["scheduledDate"].asString() shouldBe today.toString()
        val hours = MutableList(7) { 3.0 }.also { it[weekdayIndex(today)] = 0.0 }
        settings(tokens, mapOf("weeklyAvailableHours" to hours)).andExpect { status { isOk() } }
        schedule(tokens)["tasks"][0]["scheduledDate"].asString() shouldBe today.plusDays(1).toString()
    }

    test("상시 칸 설정을 바꿔도 바로 다시 배치한다 — 주 0번이면 상시 작업이 날짜를 잃는다") {
        val tokens = newUser()
        mockMvc.post("/api/v1/projects") {
            header("Authorization", api.bearer(tokens))
            contentType = MediaType.APPLICATION_JSON
            content = api.json(
                mapOf(
                    "name" to "상시", "description" to "", "deadline" to null, "color" to "teal", "deliverable" to "", "progress" to "",
                    "tasks" to listOf(mapOf("key" to "a", "title" to "꾸준히", "description" to "", "estimatedHours" to 1.0, "dependsOnKey" to null, "prerequisite" to false)),
                    "attachmentIds" to emptyList<Long>(),
                ),
            )
        }.andExpect { status { isCreated() } }
        settings(tokens, mapOf("standingSessionsPerWeek" to 0)).andExpect { status { isOk() } }
        schedule(tokens)["tasks"][0]["scheduledDate"].isNull shouldBe true
    }

    test("공휴일은 요일보다 우선한다 — 내일이 공휴일이고 공휴일 0시간이면 내일엔 작업을 넣지 않는다") {
        val tokens = newUser()
        val tomorrow = today.plusDays(1)
        jdbc.update("INSERT INTO holidays (date, name, created_at, updated_at) VALUES (?, '테스트 공휴일', now(), now()) ON CONFLICT DO NOTHING", tomorrow)
        settings(tokens, mapOf("weeklyAvailableHours" to List(7) { 3.0 }, "holidayAvailableHours" to 0)).andExpect { status { isOk() } }
        createFar(tokens, 6.0).andExpect { status { isCreated() } }
        val days = schedule(tokens)["tasks"][0]["days"].asIterable().map { it["date"].asString() }
        days shouldNotContain tomorrow.toString()
        days shouldBe listOf(today.toString(), today.plusDays(2).toString())
        jdbc.update("DELETE FROM holidays WHERE date = ? AND name = '테스트 공휴일'", tomorrow)
    }

    test("일정 응답: 요일별·공휴일 가용 시간과 앞뒤 공휴일 날짜, 오늘 가용 시간(dailyAvailableHours)") {
        val tokens = newUser()
        val holiday = today.plusDays(10)
        jdbc.update("INSERT INTO holidays (date, name, created_at, updated_at) VALUES (?, '테스트 공휴일2', now(), now()) ON CONFLICT DO NOTHING", holiday)
        val hours = MutableList(7) { 3.0 }.also { it[weekdayIndex(today)] = 1.5 }
        settings(tokens, mapOf("weeklyAvailableHours" to hours, "holidayAvailableHours" to 4)).andExpect { status { isOk() } }
        val s = schedule(tokens)
        s["weeklyAvailableHours"][weekdayIndex(today)].asDouble() shouldBe 1.5
        s["holidayAvailableHours"].asDouble() shouldBe 4.0
        s["dailyAvailableHours"].asDouble() shouldBe 1.5
        s["holidays"].asIterable().map { it.asString() } shouldContain holiday.toString()
        jdbc.update("DELETE FROM holidays WHERE date = ? AND name = '테스트 공휴일2'", holiday)
    }
})
