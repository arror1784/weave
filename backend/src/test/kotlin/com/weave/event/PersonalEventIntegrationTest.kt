package com.weave.event

import com.weave.TestcontainersConfiguration
import com.weave.support.ApiTestSupport
import io.kotest.core.extensions.ApplyExtension
import io.kotest.core.spec.style.FunSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.shouldBe
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.core.io.ClassPathResource
import org.springframework.http.MediaType
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper
import java.time.ZoneId
import java.util.UUID

/**
 * 개인 일정(사용자 결정 2026-10-17): 매주 반복 + 한 번. 그날 가용 시간에서 일정 시간만큼 뺀다(0 밑으로 안 내려감, 겹치면 한 번만).
 * 추가·삭제로는 바로 다시 배치하지 않는다 — 다음 등록·다시 배치 때 반영. 오늘·달력에 보여주려고 일정 응답에 날짜별로 넣는다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration::class)
@ApplyExtension(SpringExtension::class)
class PersonalEventIntegrationTest(private val mockMvc: MockMvc, objectMapper: ObjectMapper, jdbc: JdbcTemplate) : FunSpec({
    val api = ApiTestSupport(mockMvc, objectMapper)
    val today = java.time.LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusHours(6).toLocalDate()
    fun newUser() = api.signup("e-${UUID.randomUUID()}@example.com")
    fun add(tokens: JsonNode, body: Map<String, Any?>) = mockMvc.post("/api/v1/me/events") {
        header("Authorization", api.bearer(tokens))
        contentType = MediaType.APPLICATION_JSON
        content = api.json(body)
    }
    fun once(title: String, start: String, end: String, date: java.time.LocalDate = today) =
        mapOf("title" to title, "repeat" to "once", "date" to date.toString(), "startTime" to start, "endTime" to end)
    fun schedule(tokens: JsonNode) = api.read(mockMvc.get("/api/v1/schedule") { header("Authorization", api.bearer(tokens)) }.andReturn().response.contentAsString)

    test("반복 일정과 한 번 일정을 추가하고(201, camelCase·id) 목록으로 받고 지운다 — 남의 일정은 404, 토큰 없으면 401") {
        val tokens = newUser()
        add(tokens, mapOf("title" to "운영체제 수업", "repeat" to "weekly", "weekdays" to listOf(1, 3), "startTime" to "10:00", "endTime" to "12:00", "startDate" to today.toString(), "endDate" to null))
            .andExpect {
                status { isCreated() }
                jsonPath("$.id") { exists() }
                jsonPath("$.repeat") { value("weekly") }
                jsonPath("$.weekdays[1]") { value(3) }
                jsonPath("$.startTime") { value("10:00") }
            }
        val id = api.read(add(tokens, once("동아리 모임", "18:00", "21:00")).andExpect { status { isCreated() } }.andReturn().response.contentAsString)["id"].asLong()
        val list = api.read(mockMvc.get("/api/v1/me/events") { header("Authorization", api.bearer(tokens)) }.andExpect { status { isOk() } }.andReturn().response.contentAsString)
        list["items"].asIterable().map { it["title"].asString() } shouldBe listOf("운영체제 수업", "동아리 모임")

        val other = newUser()
        mockMvc.delete("/api/v1/me/events/$id") { header("Authorization", api.bearer(other)) }.andExpect { status { isNotFound() } }
        mockMvc.delete("/api/v1/me/events/$id") { header("Authorization", api.bearer(tokens)) }.andExpect { status { isNoContent() } }
        mockMvc.get("/api/v1/me/events").andExpect { status { isUnauthorized() } }
    }

    test("입력 검증: 이름 없음·끝이 시작보다 이름·반복인데 요일 없음·한 번인데 날짜 없음·잘못된 요일·시각 형식 오류는 400") {
        val tokens = newUser()
        add(tokens, once("", "10:00", "11:00")).andExpect { status { isBadRequest() } }
        add(tokens, once("모임", "12:00", "11:00")).andExpect { status { isBadRequest() } }
        add(tokens, mapOf("title" to "수업", "repeat" to "weekly", "weekdays" to emptyList<Int>(), "startTime" to "10:00", "endTime" to "11:00")).andExpect { status { isBadRequest() } }
        add(tokens, mapOf("title" to "수업", "repeat" to "weekly", "weekdays" to listOf(8), "startTime" to "10:00", "endTime" to "11:00")).andExpect { status { isBadRequest() } }
        add(tokens, mapOf("title" to "모임", "repeat" to "once", "startTime" to "10:00", "endTime" to "11:00")).andExpect { status { isBadRequest() } }
        add(tokens, once("모임", "25:00", "26:00")).andExpect { status { isBadRequest() } }
    }

    test("그날 가용 시간에서 일정 시간만큼 뺀다 — 겹치는 시간은 한 번만, 0 밑으로는 안 내려간다 · 오늘·달력용으로 일정을 날짜별로 준다") {
        val tokens = newUser() // 테스트 프로필 기본 가용 3시간
        add(tokens, once("수업", "10:00", "11:00")).andExpect { status { isCreated() } }
        add(tokens, once("겹친 일정", "10:30", "11:30")).andExpect { status { isCreated() } }
        val s = schedule(tokens)
        s["availableHoursByDate"][today.toString()].asDouble() shouldBe 1.5 // 3 − (10:00~11:30 = 1.5)
        s["dailyAvailableHours"].asDouble() shouldBe 1.5
        s["events"].asIterable().map { "${it["date"].asString()} ${it["startTime"].asString()}~${it["endTime"].asString()} ${it["title"].asString()}" } shouldBe
            listOf("$today 10:00~11:00 수업", "$today 10:30~11:30 겹친 일정")

        add(tokens, once("하루 종일", "09:00", "17:00", today.plusDays(1))).andExpect { status { isCreated() } }
        schedule(tokens)["availableHoursByDate"][today.plusDays(1).toString()].asDouble() shouldBe 0.0
    }

    test("반복 일정은 요일과 기간 안에서만 — 기간이 끝나면 빼지 않는다") {
        val tokens = newUser()
        val weekday = today.dayOfWeek.value
        add(tokens, mapOf("title" to "수업", "repeat" to "weekly", "weekdays" to listOf(weekday), "startTime" to "10:00", "endTime" to "12:00", "startDate" to today.toString(), "endDate" to today.plusDays(7).toString()))
            .andExpect { status { isCreated() } }
        val byDate = schedule(tokens)["availableHoursByDate"]
        byDate[today.toString()].asDouble() shouldBe 1.0
        byDate[today.plusDays(1).toString()].asDouble() shouldBe 3.0
        byDate[today.plusDays(7).toString()].asDouble() shouldBe 1.0
        byDate[today.plusDays(14).toString()].asDouble() shouldBe 3.0
    }

    test("추가해도 바로 다시 배치하지 않고, 다음 '작업 다시 배치' 때 반영한다") {
        val tokens = newUser()
        mockMvc.post("/api/v1/projects") {
            header("Authorization", api.bearer(tokens))
            contentType = MediaType.APPLICATION_JSON
            content = api.json(
                mapOf(
                    "name" to "과제", "description" to "", "deadline" to today.plusDays(30).toString(), "color" to "teal", "deliverable" to "", "progress" to "",
                    "tasks" to listOf(mapOf("key" to "a", "title" to "일", "description" to "", "estimatedHours" to 3.0, "dependsOnKey" to null, "prerequisite" to false)),
                    "attachmentIds" to emptyList<Long>(),
                ),
            )
        }.andExpect { status { isCreated() } }
        add(tokens, once("약속", "10:00", "12:00")).andExpect { status { isCreated() } }
        schedule(tokens)["tasks"][0]["days"][0]["hours"].asDouble() shouldBe 3.0 // 그대로
        mockMvc.post("/api/v1/schedule/replan") { header("Authorization", api.bearer(tokens)) }.andExpect { status { isOk() } }
        schedule(tokens)["tasks"][0]["days"].asIterable().map { it["date"].asString() to it["hours"].asDouble() } shouldBe
            listOf(today.toString() to 1.0, today.plusDays(1).toString() to 2.0)
    }

    test("추가·삭제를 사용 기록에 남기고, 탈퇴하면 개인 일정도 지운다") {
        val tokens = newUser()
        val id = api.read(add(tokens, once("약속", "10:00", "12:00")).andReturn().response.contentAsString)["id"].asLong()
        mockMvc.delete("/api/v1/me/events/$id") { header("Authorization", api.bearer(tokens)) }
        add(tokens, once("남을 약속", "10:00", "12:00"))
        val userId = tokens["user"]["id"].asLong()
        jdbc.queryForList("SELECT type FROM activity_logs WHERE user_id = ?", String::class.java, userId) shouldContain "EVENT_ADDED"
        jdbc.queryForList("SELECT type FROM activity_logs WHERE user_id = ?", String::class.java, userId) shouldContain "EVENT_DELETED"
        mockMvc.delete("/api/v1/me") { header("Authorization", api.bearer(tokens)) }.andExpect { status { isNoContent() } }
        jdbc.queryForObject("SELECT count(*) FROM personal_events WHERE user_id = ?", Long::class.java, userId) shouldBe 0L
    }

    test("운영 기본 가용 시간은 8시간이다(새 가입자 처음 값, 사용자 결정 2026-10-17) — 테스트 프로필만 3시간") {
        val yaml = YamlPropertiesFactoryBean().apply { setResources(ClassPathResource("application.yml")) }.getObject()!!
        yaml.getProperty("weave.defaults.available-hours") shouldBe "8"
        val me = api.read(mockMvc.get("/api/v1/me") { header("Authorization", api.bearer(newUser())) }.andReturn().response.contentAsString)
        me["weeklyAvailableHours"][0].asDouble() shouldBe 3.0
    }
})
