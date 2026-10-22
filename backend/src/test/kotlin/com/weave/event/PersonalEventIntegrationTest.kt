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
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper
import java.time.ZoneId
import java.util.UUID

/**
 * 개인 일정(사용자 결정 2026-10-17): 매주 반복 + 한 번. 그날 가용 시간에서 일정 시간만큼 뺀다(0 밑으로 안 내려감, 겹치면 한 번만).
 * 오늘·달력에 보여주려고 일정 응답에 날짜별로 넣는다.
 * 2026-10-23: 수정 · 한 번 일정은 날짜 여러 개 또는 이어진 일정 · 추가·수정·삭제하면 밀린 작업까지 바로 다시 배치(설정 변경과 같게).
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

    test("입력 검증: 이름 없음·끝과 시작이 같음·반복인데 요일 없음·한 번인데 날짜 없음·잘못된 요일·시각 형식 오류는 400") {
        val tokens = newUser()
        add(tokens, once("", "10:00", "11:00")).andExpect { status { isBadRequest() } }
        add(tokens, once("모임", "11:00", "11:00")).andExpect { status { isBadRequest() } }
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

    test("자정을 넘기는 일정(끝 < 시작)도 받는다 · 새벽에 시작하는 일정은 앞날(하루는 6시에 바뀐다)에서 빼고 앞날에 보여준다 (사용자 결정 2026-10-18)") {
        val tokens = newUser() // 테스트 프로필 기본 가용 3시간
        add(tokens, once("밤 모임", "23:00", "01:00", today.plusDays(1))).andExpect { status { isCreated() } }
        add(tokens, once("새벽 일", "01:00", "02:00", today.plusDays(3))).andExpect { status { isCreated() } }
        val s = schedule(tokens)
        s["availableHoursByDate"][today.plusDays(1).toString()].asDouble() shouldBe 1.0
        s["availableHoursByDate"][today.plusDays(2).toString()].asDouble() shouldBe 2.0 // 3일 뒤 01:00 → 이틀 뒤 몫
        s["availableHoursByDate"][today.plusDays(3).toString()].asDouble() shouldBe 3.0
        s["events"].asIterable().map { "${it["date"].asString()} ${it["startTime"].asString()}~${it["endTime"].asString()}" } shouldBe
            listOf("${today.plusDays(1)} 23:00~01:00", "${today.plusDays(2)} 01:00~02:00")
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

    fun edit(tokens: JsonNode, id: Long, body: Map<String, Any?>) = mockMvc.patch("/api/v1/me/events/$id") {
        header("Authorization", api.bearer(tokens))
        contentType = MediaType.APPLICATION_JSON
        content = api.json(body)
    }
    fun registerProject(tokens: JsonNode, hours: Double) = mockMvc.post("/api/v1/projects") {
        header("Authorization", api.bearer(tokens))
        contentType = MediaType.APPLICATION_JSON
        content = api.json(
            mapOf(
                "name" to "과제", "description" to "", "deadline" to today.plusDays(30).toString(), "color" to "teal", "deliverable" to "", "progress" to "",
                "tasks" to listOf(mapOf("key" to "a", "title" to "일", "description" to "", "estimatedHours" to hours, "dependsOnKey" to null, "prerequisite" to false)),
                "attachmentIds" to emptyList<Long>(),
            ),
        )
    }.andExpect { status { isCreated() } }
    fun taskDays(tokens: JsonNode) = schedule(tokens)["tasks"][0]["days"].asIterable().map { it["date"].asString() to it["hours"].asDouble() }

    test("추가·수정·삭제하면 밀린 작업까지 바로 다시 배치한다 (사용자 결정 2026-10-23 — 전엔 다음 배치 때 반영)") {
        val tokens = newUser() // 테스트 프로필 기본 가용 3시간
        registerProject(tokens, 3.0)
        taskDays(tokens) shouldBe listOf(today.toString() to 3.0)
        val id = api.read(add(tokens, once("약속", "10:00", "12:00")).andExpect { status { isCreated() } }.andReturn().response.contentAsString)["id"].asLong()
        taskDays(tokens) shouldBe listOf(today.toString() to 1.0, today.plusDays(1).toString() to 2.0)
        edit(tokens, id, once("약속", "10:00", "11:00")).andExpect { status { isOk() } }
        taskDays(tokens) shouldBe listOf(today.toString() to 2.0, today.plusDays(1).toString() to 1.0)
        mockMvc.delete("/api/v1/me/events/$id") { header("Authorization", api.bearer(tokens)) }.andExpect { status { isNoContent() } }
        taskDays(tokens) shouldBe listOf(today.toString() to 3.0)
    }

    test("수정은 모든 칸을 바꾼다 — 매주 반복을 한 번으로(200, camelCase·id) · 남의 일정은 404 · 검증은 추가와 같다") {
        val tokens = newUser()
        val id = api.read(
            add(tokens, mapOf("title" to "수업", "repeat" to "weekly", "weekdays" to listOf(1), "startTime" to "10:00", "endTime" to "12:00")).andReturn().response.contentAsString,
        )["id"].asLong()
        edit(tokens, id, mapOf("title" to "보강", "repeat" to "once", "dates" to listOf(today.plusDays(2).toString(), today.toString()), "startTime" to "13:15", "endTime" to "14:45"))
            .andExpect {
                status { isOk() }
                jsonPath("$.id") { value(id) }
                jsonPath("$.title") { value("보강") }
                jsonPath("$.repeat") { value("once") }
                jsonPath("$.weekdays.length()") { value(0) }
                jsonPath("$.date") { value(today.toString()) }
                jsonPath("$.dates[1]") { value(today.plusDays(2).toString()) }
                jsonPath("$.startTime") { value("13:15") }
                jsonPath("$.untilDate") { value(null) }
            }
        edit(newUser(), id, once("남의 것", "10:00", "11:00")).andExpect { status { isNotFound() } }
        edit(tokens, id, once("", "10:00", "11:00")).andExpect { status { isBadRequest() } }
        mockMvc.patch("/api/v1/me/events/$id") { contentType = MediaType.APPLICATION_JSON; content = api.json(once("a", "10:00", "11:00")) }.andExpect { status { isUnauthorized() } }
    }

    test("날짜 지정 일정은 고른 날짜마다 같은 시각을 뺀다 — 분은 아무 값이나(10:15)") {
        val tokens = newUser()
        add(tokens, mapOf("title" to "회식", "repeat" to "once", "dates" to listOf(today.toString(), today.plusDays(3).toString()), "startTime" to "10:15", "endTime" to "11:45"))
            .andExpect { status { isCreated() } }
        val s = schedule(tokens)
        s["availableHoursByDate"][today.toString()].asDouble() shouldBe 1.5
        s["availableHoursByDate"][today.plusDays(1).toString()].asDouble() shouldBe 3.0
        s["availableHoursByDate"][today.plusDays(3).toString()].asDouble() shouldBe 1.5
        s["events"].asIterable().map { "${it["date"].asString()} ${it["startTime"].asString()}~${it["endTime"].asString()}" } shouldBe
            listOf("$today 10:15~11:45", "${today.plusDays(3)} 10:15~11:45")
    }

    test("이어진 일정은 하루(6시~다음 날 6시)마다 겹치는 만큼 빼고, 날마다 그날 부분과 이어짐 표시를 준다") {
        val tokens = newUser() // 기본 가용 3시간
        add(tokens, mapOf("title" to "MT", "repeat" to "once", "date" to today.toString(), "untilDate" to today.plusDays(2).toString(), "startTime" to "20:00", "endTime" to "08:00"))
            .andExpect {
                status { isCreated() }
                jsonPath("$.untilDate") { value(today.plusDays(2).toString()) }
            }
        val s = schedule(tokens)
        s["availableHoursByDate"][today.toString()].asDouble() shouldBe 0.0 // 20:00~06:00 = 10h
        s["availableHoursByDate"][today.plusDays(1).toString()].asDouble() shouldBe 0.0 // 하루 통째로
        s["availableHoursByDate"][today.plusDays(2).toString()].asDouble() shouldBe 1.0 // 06:00~08:00 = 2h
        s["availableHoursByDate"][today.plusDays(3).toString()].asDouble() shouldBe 3.0
        s["events"].asIterable().map { "${it["date"].asString()} ${it["startTime"].asString()}~${it["endTime"].asString()} ${it["fromPreviousDay"].asBoolean()} ${it["toNextDay"].asBoolean()}" } shouldBe
            listOf("$today 20:00~06:00 false true", "${today.plusDays(1)} 06:00~06:00 true true", "${today.plusDays(2)} 06:00~08:00 true false")
    }

    test("여러 날·이어진 일정 검증: 날짜 없음·끝 날짜가 시작보다 앞·끝 시각이 시작보다 앞(같은 날)·날짜 100개 넘음은 400") {
        val tokens = newUser()
        add(tokens, mapOf("title" to "a", "repeat" to "once", "dates" to emptyList<String>(), "startTime" to "10:00", "endTime" to "11:00")).andExpect { status { isBadRequest() } }
        add(tokens, mapOf("title" to "a", "repeat" to "once", "date" to today.toString(), "untilDate" to today.minusDays(1).toString(), "startTime" to "10:00", "endTime" to "11:00")).andExpect { status { isBadRequest() } }
        add(tokens, mapOf("title" to "a", "repeat" to "once", "date" to today.toString(), "untilDate" to today.toString(), "startTime" to "10:00", "endTime" to "09:00")).andExpect { status { isBadRequest() } }
        add(tokens, mapOf("title" to "a", "repeat" to "once", "dates" to (0L..100L).map { today.plusDays(it).toString() }, "startTime" to "10:00", "endTime" to "11:00")).andExpect { status { isBadRequest() } }
    }

    test("추가·수정·삭제를 사용 기록에 남기고, 탈퇴하면 개인 일정도 지운다") {
        val tokens = newUser()
        val id = api.read(add(tokens, once("약속", "10:00", "12:00")).andReturn().response.contentAsString)["id"].asLong()
        mockMvc.delete("/api/v1/me/events/$id") { header("Authorization", api.bearer(tokens)) }
        val kept = api.read(add(tokens, once("남을 약속", "10:00", "12:00")).andReturn().response.contentAsString)["id"].asLong()
        edit(tokens, kept, once("남을 약속", "10:00", "13:00")).andExpect { status { isOk() } }
        val userId = tokens["user"]["id"].asLong()
        jdbc.queryForList("SELECT type FROM activity_logs WHERE user_id = ?", String::class.java, userId) shouldContain "EVENT_ADDED"
        jdbc.queryForList("SELECT type FROM activity_logs WHERE user_id = ?", String::class.java, userId) shouldContain "EVENT_DELETED"
        jdbc.queryForList("SELECT type FROM activity_logs WHERE user_id = ?", String::class.java, userId) shouldContain "EVENT_UPDATED"
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
