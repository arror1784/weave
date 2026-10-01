package com.weave.project

import com.weave.TestcontainersConfiguration
import com.weave.support.ApiTestSupport
import io.kotest.core.extensions.ApplyExtension
import io.kotest.core.spec.style.FunSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.shouldBe
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
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
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration::class)
@ApplyExtension(SpringExtension::class)
class ProjectIntegrationTest(private val mockMvc: MockMvc, objectMapper: ObjectMapper, jdbc: JdbcTemplate) : FunSpec({
    val api = ApiTestSupport(mockMvc, objectMapper)
    val today = LocalDate.now(ZoneId.of("Asia/Seoul"))
    fun newUser() = api.signup("p-${UUID.randomUUID()}@example.com")

    fun task(key: String, title: String, hours: Double, dependsOn: String? = null, prerequisite: Boolean = false) =
        mapOf("key" to key, "title" to title, "estimatedHours" to hours, "dependsOnKey" to dependsOn, "prerequisite" to prerequisite)

    val embeddedTasks = listOf(
        task("k1", "관련 개념 학습", 2.0, prerequisite = true),
        task("k2", "설계 문서 작성", 3.0, "k1"),
        task("k3", "보고서 초안 작성", 4.0, "k2"),
        task("k4", "발표자료 제작", 2.0),
    )

    fun create(tokens: JsonNode, body: Map<String, Any?>) = mockMvc.post("/api/v1/projects") {
        header("Authorization", api.bearer(tokens))
        contentType = MediaType.APPLICATION_JSON
        content = api.json(body)
    }

    fun createOk(tokens: JsonNode, name: String = "임베디드", deadline: LocalDate? = today.plusDays(9), color: String = "teal", tasks: List<Map<String, Any?>> = embeddedTasks): JsonNode =
        api.read(create(tokens, mapOf("name" to name, "description" to "설명", "deadline" to deadline?.toString(), "color" to color, "tasks" to tasks))
            .andExpect { status { isCreated() } }.andReturn().response.contentAsString)

    test("등록하면 서버가 임시 일정 알고리즘으로 날짜·기간·작업 마감일을 배정하고 선행 작업을 id로 잇는다") {
        val body = createOk(newUser())
        val project = body["project"]
        project["id"].isNumber shouldBe true
        project["status"].asString() shouldBe "active"
        project["color"].asString() shouldBe "teal"
        body["lateCount"].asInt() shouldBe 0
        val tasks = project["tasks"]
        tasks.asIterable().map { it["title"].asString() } shouldBe listOf("관련 개념 학습", "설계 문서 작성", "보고서 초안 작성", "발표자료 제작")
        tasks.asIterable().map { it["scheduledDate"].asString() } shouldBe listOf(today, today.plusDays(1), today.plusDays(2), today.plusDays(4)).map { it.toString() }
        tasks[2]["spanDays"].asInt() shouldBe 2
        tasks[0]["dueDate"].asString() shouldBe today.plusDays(6).toString()
        tasks[1]["dependsOnId"].asLong() shouldBe tasks[0]["id"].asLong()
        tasks[0]["prerequisite"].asBoolean() shouldBe true
        tasks[0]["done"].asBoolean() shouldBe false
    }

    test("두 번째 프로젝트는 첫 프로젝트가 쓴 시간을 피해 배정한다") {
        val tokens = newUser()
        createOk(tokens, tasks = listOf(task("a", "하루 꽉 참", 3.0)))
        val second = createOk(tokens, name = "두 번째", deadline = null, tasks = listOf(task("b", "다음 날로", 1.0)))
        second["project"]["tasks"][0]["scheduledDate"].asString() shouldBe today.plusDays(1).toString()
    }

    test("입력 검증: 이름 없음·작업 없음·없는 색·없는 선행 key·날짜 형식 오류는 400") {
        val tokens = newUser()
        val valid = mapOf("name" to "x", "description" to "", "deadline" to null, "color" to "teal", "tasks" to listOf(task("a", "t", 1.0)))
        for (broken in listOf(
            valid + ("name" to " "),
            valid + ("tasks" to emptyList<Any>()),
            valid + ("color" to "red"),
            valid + ("tasks" to listOf(task("a", "t", 1.0, dependsOn = "zzz"))),
            valid + ("deadline" to "10월 9일"),
            valid + ("tasks" to listOf(task("a", "t", 0.0))),
        )) {
            create(tokens, broken).andExpect { status { isBadRequest() } }
        }
    }

    test("목록: 진행중/완료로 거르고 마감 가까운 순(마감 없음은 뒤), 페이지로 나눈다, 요약(완료 수·다음 작업)을 준다") {
        val tokens = newUser()
        createOk(tokens, name = "상시", deadline = null)
        createOk(tokens, name = "먼 마감", deadline = today.plusDays(20))
        createOk(tokens, name = "가까운 마감", deadline = today.plusDays(5))
        mockMvc.get("/api/v1/projects?status=active&page=0&size=2") { header("Authorization", api.bearer(tokens)) }.andExpect {
            status { isOk() }
            jsonPath("$.items.length()") { value(2) }
            jsonPath("$.items[0].name") { value("가까운 마감") }
            jsonPath("$.items[1].name") { value("먼 마감") }
            jsonPath("$.items[0].totalCount") { value(4) }
            jsonPath("$.items[0].doneCount") { value(0) }
            jsonPath("$.items[0].nextTaskTitle") { value("관련 개념 학습") }
            jsonPath("$.totalElements") { value(3) }
            jsonPath("$.totalPages") { value(2) }
        }
        mockMvc.get("/api/v1/projects?status=done") { header("Authorization", api.bearer(tokens)) }
            .andExpect { status { isOk() }; jsonPath("$.items.length()") { value(0) } }
    }

    test("남의 프로젝트·작업은 조회·수정할 수 없다 (404)") {
        val owner = newUser()
        val other = newUser()
        val project = createOk(owner)["project"]
        val id = project["id"].asLong()
        val taskId = project["tasks"][0]["id"].asLong()
        mockMvc.get("/api/v1/projects/$id") { header("Authorization", api.bearer(other)) }.andExpect { status { isNotFound() } }
        mockMvc.patch("/api/v1/projects/$id") {
            header("Authorization", api.bearer(other))
            contentType = MediaType.APPLICATION_JSON
            content = api.json(mapOf("color" to "blue"))
        }.andExpect { status { isNotFound() } }
        mockMvc.patch("/api/v1/tasks/$taskId") {
            header("Authorization", api.bearer(other))
            contentType = MediaType.APPLICATION_JSON
            content = api.json(mapOf("done" to true))
        }.andExpect { status { isNotFound() } }
    }

    test("프로젝트 색을 바꾸고, 완료로 바꾼다. 완료를 진행중으로 되돌리는 것은 (미정이라) 막는다") {
        val tokens = newUser()
        val id = createOk(tokens)["project"]["id"].asLong()
        val patch = { body: Map<String, Any> ->
            mockMvc.patch("/api/v1/projects/$id") {
                header("Authorization", api.bearer(tokens))
                contentType = MediaType.APPLICATION_JSON
                content = api.json(body)
            }
        }
        patch(mapOf("color" to "blue")).andExpect { status { isOk() }; jsonPath("$.color") { value("blue") } }
        patch(mapOf("status" to "done")).andExpect { status { isOk() }; jsonPath("$.status") { value("done") } }
        patch(mapOf("status" to "active")).andExpect { status { isBadRequest() } }
    }

    test("작업 완료 체크: 마지막 작업을 끝내면 projectAllDone=true (앱이 완료 여부를 묻는다)") {
        val tokens = newUser()
        val tasks = createOk(tokens, tasks = listOf(task("a", "첫", 1.0), task("b", "둘", 1.0)))["project"]["tasks"]
        val toggle = { taskId: Long, done: Boolean ->
            mockMvc.patch("/api/v1/tasks/$taskId") {
                header("Authorization", api.bearer(tokens))
                contentType = MediaType.APPLICATION_JSON
                content = api.json(mapOf("done" to done))
            }
        }
        toggle(tasks[0]["id"].asLong(), true).andExpect { status { isOk() }; jsonPath("$.task.done") { value(true) }; jsonPath("$.projectAllDone") { value(false) } }
        toggle(tasks[1]["id"].asLong(), true).andExpect { status { isOk() }; jsonPath("$.projectAllDone") { value(true) } }
        toggle(tasks[1]["id"].asLong(), false).andExpect { status { isOk() }; jsonPath("$.projectAllDone") { value(false) } }
    }

    test("일정 스냅샷: 오늘(한국 시간)·하루 가용 시간·진행중 프로젝트와 그 작업만 준다") {
        val tokens = newUser()
        val active = createOk(tokens, name = "진행중")["project"]["id"].asLong()
        val done = createOk(tokens, name = "끝남")["project"]["id"].asLong()
        mockMvc.patch("/api/v1/projects/$done") {
            header("Authorization", api.bearer(tokens))
            contentType = MediaType.APPLICATION_JSON
            content = api.json(mapOf("status" to "done"))
        }
        mockMvc.get("/api/v1/schedule") { header("Authorization", api.bearer(tokens)) }.andExpect {
            status { isOk() }
            jsonPath("$.today") { value(today.toString()) }
            jsonPath("$.dailyAvailableHours") { value(3.0) }
            jsonPath("$.projects.length()") { value(1) }
            jsonPath("$.projects[0].id") { value(active) }
            jsonPath("$.tasks.length()") { value(4) }
            jsonPath("$.tasks[0].projectId") { value(active) }
        }
    }

    test("탈퇴하면 프로젝트와 작업 행이 실제로 지워진다") {
        val tokens = newUser()
        val userId = tokens["user"]["id"].asLong()
        createOk(tokens)
        mockMvc.delete("/api/v1/me") { header("Authorization", api.bearer(tokens)) }.andExpect { status { isNoContent() } }
        jdbc.queryForObject("SELECT count(*) FROM projects WHERE user_id = ?", Long::class.java, userId) shouldBe 0L
        jdbc.queryForObject("SELECT count(*) FROM tasks t WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = t.project_id)", Long::class.java) shouldBe 0L
    }
})
