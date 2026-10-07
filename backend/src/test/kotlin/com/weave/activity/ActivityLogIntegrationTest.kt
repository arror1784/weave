package com.weave.activity

import com.weave.TestcontainersConfiguration
import com.weave.client.AiClient
import com.weave.client.AiResult
import com.weave.client.AiTool
import com.weave.client.AiTurn
import com.weave.support.ApiTestSupport
import io.kotest.core.extensions.ApplyExtension
import io.kotest.core.spec.style.FunSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.collections.shouldContainAll
import io.kotest.matchers.collections.shouldNotContain
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Import
import org.springframework.context.annotation.Primary
import org.springframework.http.MediaType
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.mock.web.MockMultipartFile
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.multipart
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

/** 실제 Claude API 대신 고정 응답 + 토큰 사용량 */
@TestConfiguration(proxyBeanMethods = false)
class ActivityFakeAiConfiguration {
    @Bean
    @Primary
    fun activityFakeAiClient(): AiClient = object : AiClient {
        override fun converse(system: String, turns: List<AiTurn>, tool: AiTool, forceTool: Boolean) =
            AiResult("팀원은 몇 명인가요?", null, inputTokens = 1200, outputTokens = 40)
    }
}

/** 사용 기록(사용자 결정 2026-10-07): 프로젝트·작업·AI 챗봇(대화 본문 포함)·앱 사용·설정·첨부를 DB에 남기고 엑셀로 내보낸다 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration::class, ActivityFakeAiConfiguration::class)
@ApplyExtension(SpringExtension::class)
class ActivityLogIntegrationTest(private val mockMvc: MockMvc, objectMapper: ObjectMapper, jdbc: JdbcTemplate) : FunSpec({
    val api = ApiTestSupport(mockMvc, objectMapper)
    val today = java.time.LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusHours(6).toLocalDate()
    fun newUser() = api.signup("a-${UUID.randomUUID()}@example.com")
    fun uid(tokens: JsonNode) = tokens["user"]["id"].asLong()

    /** 그 사용자의 기록 (종류, 프로젝트 id, 작업 id, 출처, 내용 JSON) — 시각순 */
    fun logs(tokens: JsonNode) = jdbc.queryForList(
        "SELECT type, project_id, task_id, source, detail FROM activity_logs WHERE user_id = ? ORDER BY occurred_at, id", uid(tokens),
    )
    fun types(tokens: JsonNode) = logs(tokens).map { it["type"] as String }
    fun detailOf(tokens: JsonNode, type: String) = api.read(logs(tokens).last { it["type"] == type }["detail"] as String)

    fun json(method: String, path: String, tokens: JsonNode, body: Any) = when (method) {
        "POST" -> mockMvc.post(path) { header("Authorization", api.bearer(tokens)); contentType = MediaType.APPLICATION_JSON; content = api.json(body) }
        else -> mockMvc.patch(path) { header("Authorization", api.bearer(tokens)); contentType = MediaType.APPLICATION_JSON; content = api.json(body) }
    }
    fun task(key: String, title: String, hours: Double) =
        mapOf("key" to key, "title" to title, "description" to "", "estimatedHours" to hours, "dependsOnKey" to null, "prerequisite" to false)
    fun project(name: String, tasks: List<Map<String, Any?>>, deadline: LocalDate? = today.plusDays(9)) = mapOf(
        "name" to name, "description" to "설명", "deadline" to deadline?.toString(), "color" to "teal",
        "deliverable" to "보고서", "progress" to "", "tasks" to tasks, "attachmentIds" to emptyList<Long>(),
    )
    fun create(tokens: JsonNode, name: String = "임베디드", tasks: List<Map<String, Any?>> = listOf(task("a", "설계", 2.0), task("b", "구현", 3.0))) =
        api.read(json("POST", "/api/v1/projects", tokens, project(name, tasks)).andExpect { status { isCreated() } }.andReturn().response.contentAsString)["project"]

    test("가입·로그인·로그아웃을 기록한다") {
        val email = "a-${UUID.randomUUID()}@example.com"
        val tokens = api.signup(email)
        val login = api.read(mockMvc.post("/api/v1/auth/login") {
            contentType = MediaType.APPLICATION_JSON
            content = api.json(mapOf("email" to email, "password" to "weave2026!"))
        }.andReturn().response.contentAsString)
        mockMvc.post("/api/v1/auth/logout") {
            header("Authorization", api.bearer(login))
            contentType = MediaType.APPLICATION_JSON
            content = api.json(mapOf("refreshToken" to login["refreshToken"].asString()))
        }
        types(tokens) shouldBe listOf("SIGNUP", "LOGIN", "LOGOUT")
        logs(tokens).map { it["source"] }.toSet() shouldBe setOf("server")
    }

    test("프로젝트 등록·작업 완료/해제(완료 시각 저장)·색 변경·재요청·완료·삭제를 기록한다") {
        val tokens = newUser()
        val p = create(tokens)
        val id = p["id"].asLong()
        val taskId = p["tasks"][0]["id"].asLong()
        detailOf(tokens, "PROJECT_CREATED").let {
            it["name"].asString() shouldBe "임베디드"
            it["taskCount"].asInt() shouldBe 2
            it["totalHours"].asDouble() shouldBe 5.0
        }

        json("PATCH", "/api/v1/tasks/$taskId", tokens, mapOf("done" to true))
        jdbc.queryForObject("SELECT done_at FROM tasks WHERE id = ?", java.sql.Timestamp::class.java, taskId) shouldNotBe null
        json("PATCH", "/api/v1/tasks/$taskId", tokens, mapOf("done" to false))
        jdbc.queryForObject("SELECT done_at FROM tasks WHERE id = ?", java.sql.Timestamp::class.java, taskId) shouldBe null
        json("PATCH", "/api/v1/tasks/$taskId", tokens, mapOf("done" to true))
        detailOf(tokens, "TASK_DONE")["title"].asString() shouldBe "설계"
        logs(tokens).last { it["type"] == "TASK_DONE" }["task_id"] shouldBe taskId

        json("PATCH", "/api/v1/projects/$id", tokens, mapOf("color" to "blue"))
        detailOf(tokens, "PROJECT_COLOR_CHANGED").let { it["from"].asString() shouldBe "teal"; it["to"].asString() shouldBe "blue" }

        json("POST", "/api/v1/projects/$id/replan-tasks", tokens, project("임베디드 중간발표", listOf(task("n", "새 구현", 1.5)))).andExpect { status { isOk() } }
        detailOf(tokens, "PROJECT_REPLANNED").let {
            it["keptDone"].asInt() shouldBe 1
            it["removed"].asInt() shouldBe 1
            it["added"].asInt() shouldBe 1
        }

        json("PATCH", "/api/v1/projects/$id", tokens, mapOf("status" to "done"))
        mockMvc.delete("/api/v1/projects/$id") { header("Authorization", api.bearer(tokens)) }

        types(tokens) shouldContainAll listOf("PROJECT_CREATED", "TASK_DONE", "TASK_UNDONE", "PROJECT_COLOR_CHANGED", "PROJECT_REPLANNED", "PROJECT_COMPLETED", "PROJECT_DELETED")
        logs(tokens).filter { it["type"] != "SIGNUP" }.all { it["project_id"] == id } shouldBe true
    }

    test("밀린 작업을 오늘로 옮기면 옮긴 개수를 기록하고, 옮길 게 없으면 남기지 않는다") {
        val tokens = newUser()
        val taskId = create(tokens)["tasks"][0]["id"].asLong()
        mockMvc.get("/api/v1/schedule") { header("Authorization", api.bearer(tokens)) }
        types(tokens) shouldNotContain "OVERDUE_MOVED"
        jdbc.update("UPDATE tasks SET scheduled_date = ?, day_hours = '' WHERE id = ?", today.minusDays(2), taskId)
        mockMvc.get("/api/v1/schedule") { header("Authorization", api.bearer(tokens)) }
        detailOf(tokens, "OVERDUE_MOVED")["count"].asInt() shouldBe 1
    }

    test("하루 가용 시간 변경(전→후)과 작업 다시 배치를 기록한다") {
        val tokens = newUser()
        json("PATCH", "/api/v1/me/settings", tokens, mapOf("dailyAvailableHours" to 4.5))
        mockMvc.post("/api/v1/schedule/replan") { header("Authorization", api.bearer(tokens)) }
        detailOf(tokens, "SETTINGS_CHANGED").let { it["from"].asDouble() shouldBe 3.0; it["to"].asDouble() shouldBe 4.5 }
        types(tokens) shouldContainAll listOf("SETTINGS_CHANGED", "SCHEDULE_REPLANNED")
    }

    test("첨부 올리기·링크·지우기를 기록한다 (파일 이름·형식·크기)") {
        val tokens = newUser()
        val pdf = "%PDF-1.7\n%%EOF".toByteArray()
        val id = api.read(mockMvc.multipart("/api/v1/attachments") {
            file(MockMultipartFile("file", "명세서.pdf", "application/pdf", pdf))
            header("Authorization", api.bearer(tokens))
        }.andReturn().response.contentAsString)["id"].asLong()
        json("POST", "/api/v1/attachments/links", tokens, mapOf("url" to "https://example.com/spec"))
        mockMvc.delete("/api/v1/attachments/$id") { header("Authorization", api.bearer(tokens)) }
        detailOf(tokens, "ATTACHMENT_UPLOADED").let {
            it["name"].asString() shouldBe "명세서.pdf"
            it["contentType"].asString() shouldBe "application/pdf"
            it["size"].asLong() shouldBe pdf.size.toLong()
        }
        types(tokens) shouldContainAll listOf("ATTACHMENT_UPLOADED", "ATTACHMENT_LINK_ADDED", "ATTACHMENT_DELETED")
    }

    test("AI 챗봇: 보낸 답·AI 응답 본문·응답 종류·걸린 시간·토큰 사용량을 기록한다") {
        val tokens = newUser()
        json(
            "POST", "/api/v1/project-chat", tokens,
            mapOf(
                "project" to mapOf("name" to "캡스톤", "description" to "", "deadline" to null),
                "messages" to listOf(mapOf("role" to "assistant", "text" to "주제가 있나요?"), mapOf("role" to "user", "text" to "정해진 주제가 있어")),
            ),
        ).andExpect { status { isOk() } }
        val d = detailOf(tokens, "AI_CHAT")
        d["projectName"].asString() shouldBe "캡스톤"
        d["userMessage"].asString() shouldBe "정해진 주제가 있어"
        d["responseType"].asString() shouldBe "question"
        d["aiMessage"].asString() shouldBe "팀원은 몇 명인가요?"
        d["turn"].asInt() shouldBe 1
        d["inputTokens"].asInt() shouldBe 1200
        d["outputTokens"].asInt() shouldBe 40
        d.has("durationMs") shouldBe true
    }

    test("앱 사용 기록: 허용한 종류만 받고(앱 열기·화면 보기·위젯 갱신) 출처를 app으로 남긴다") {
        val tokens = newUser()
        json("POST", "/api/v1/activity/events", tokens, mapOf("events" to listOf(
            mapOf("type" to "APP_OPENED", "occurredAt" to java.time.Instant.now().toString()),
            mapOf("type" to "SCREEN_VIEWED", "detail" to mapOf("path" to "/projects/3")),
            mapOf("type" to "WIDGET_RENDERED", "detail" to mapOf("taskCount" to 2)),
        ))).andExpect { status { isNoContent() } }
        logs(tokens).filter { it["source"] == "app" }.map { it["type"] } shouldBe listOf("APP_OPENED", "SCREEN_VIEWED", "WIDGET_RENDERED")
        detailOf(tokens, "SCREEN_VIEWED")["path"].asString() shouldBe "/projects/3"

        json("POST", "/api/v1/activity/events", tokens, mapOf("events" to listOf(mapOf("type" to "PROJECT_DELETED")))).andExpect { status { isBadRequest() } }
        json("POST", "/api/v1/activity/events", tokens, mapOf("events" to List(51) { mapOf("type" to "APP_OPENED") })).andExpect { status { isBadRequest() } }
        mockMvc.post("/api/v1/activity/events") { contentType = MediaType.APPLICATION_JSON; content = api.json(mapOf("events" to emptyList<Any>())) }
            .andExpect { status { isUnauthorized() } }
    }

    test("엑셀 내보내기: 내 기록만, 시트 4개(활동 기록·날짜별 요약·프로젝트별·AI 대화)") {
        val tokens = newUser()
        val other = newUser()
        create(tokens, name = "내 프로젝트")
        create(other, name = "남의 프로젝트")
        val res = mockMvc.get("/api/v1/me/activity/export") { header("Authorization", api.bearer(tokens)) }
            .andExpect { status { isOk() } }.andReturn().response
        res.contentType shouldBe "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        res.getHeader("Content-Disposition")!! shouldContain "attachment"
        XSSFWorkbook(res.contentAsByteArray.inputStream()).use { wb ->
            (0 until wb.numberOfSheets).map { wb.getSheetName(it) } shouldBe listOf("활동 기록", "날짜별 요약", "프로젝트별", "AI 대화")
            val text = (0..wb.getSheet("활동 기록").lastRowNum).joinToString("\n") { r ->
                wb.getSheet("활동 기록").getRow(r).joinToString(" | ") { it.toString() }
            }
            text shouldContain "프로젝트 등록"
            text shouldContain "내 프로젝트"
            (text.contains("남의 프로젝트")) shouldBe false
        }
        mockMvc.get("/api/v1/me/activity/export").andExpect { status { isUnauthorized() } }
    }

    test("탈퇴하면 사용 기록도 실제로 지운다") {
        val tokens = newUser()
        create(tokens)
        mockMvc.delete("/api/v1/me") { header("Authorization", api.bearer(tokens)) }.andExpect { status { isNoContent() } }
        jdbc.queryForObject("SELECT count(*) FROM activity_logs WHERE user_id = ?", Long::class.java, uid(tokens)) shouldBe 0L
    }

    test("기능 전 데이터 채우기(V10): 가입·프로젝트·첨부 생성 시각으로 backfill 기록을 만들고, 다시 돌려도 늘지 않는다") {
        val tokens = newUser()
        val id = create(tokens)["id"].asLong()
        jdbc.update("DELETE FROM activity_logs WHERE user_id = ?", uid(tokens))
        val sql = String(javaClass.getResourceAsStream("/db/migration/V10__backfill_activity_logs.sql")!!.readAllBytes())
        repeat(2) { jdbc.execute(sql) }
        val rows = logs(tokens)
        rows.map { it["type"] } shouldBe listOf("SIGNUP", "PROJECT_CREATED")
        rows.map { it["source"] }.toSet() shouldBe setOf("backfill")
        rows[1]["project_id"] shouldBe id
        api.read(rows[1]["detail"] as String)["name"].asString() shouldBe "임베디드"
    }
})
