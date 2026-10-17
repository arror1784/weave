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
    // 서버의 '오늘'은 아침 6시에 바뀐다(TodayProvider)
    val today = java.time.LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusHours(6).toLocalDate()
    fun newUser() = api.signup("p-${UUID.randomUUID()}@example.com")

    fun task(key: String, title: String, hours: Double, dependsOn: String? = null, prerequisite: Boolean = false, description: String = "") =
        mapOf("key" to key, "title" to title, "description" to description, "estimatedHours" to hours, "dependsOnKey" to dependsOn, "prerequisite" to prerequisite)

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
        // 하루에 최대한 채워 앞당기기: 개념 2h(오늘) → 설계 오늘 1h + 내일 2h → 보고서 내일 1h + 모레 3h → 발표 글피 2h
        tasks.asIterable().map { it["scheduledDate"].asString() } shouldBe listOf(today, today, today.plusDays(1), today.plusDays(3)).map { it.toString() }
        tasks[1]["days"].asIterable().map { it["date"].asString() to it["hours"].asDouble() } shouldBe listOf(today.toString() to 1.0, today.plusDays(1).toString() to 2.0)
        tasks[2]["spanDays"].asInt() shouldBe 2
        tasks[0]["dueDate"].asString() shouldBe today.plusDays(6).toString()
        tasks[1]["dependsOnId"].asLong() shouldBe tasks[0]["id"].asLong()
        tasks[0]["prerequisite"].asBoolean() shouldBe true
        tasks[0]["done"].asBoolean() shouldBe false
    }

    test("작업 세부 설명(목표·범위·완료 기준)을 저장하고 돌려준다") {
        val body = createOk(newUser(), tasks = listOf(task("a", "설계 문서 작성", 3.0, description = "블록도와 시퀀스 다이어그램, 리뷰 1회")))
        body["project"]["tasks"][0]["description"].asString() shouldBe "블록도와 시퀀스 다이어그램, 리뷰 1회"
    }

    test("이미 지난 마감일로도 등록할 수 있다 — 작업은 오늘부터 몰아 배치하고 빠듯함으로 센다(사용자 결정 2026-10-17)") {
        val body = createOk(newUser(), deadline = today.minusDays(3), tasks = listOf(task("a", "늦은 일", 2.0), task("b", "더 늦은 일", 2.0)))
        val tasks = body["project"]["tasks"]
        tasks.asIterable().map { it["scheduledDate"].asString() } shouldBe listOf(today.toString(), today.toString())
        tasks.asIterable().map { it["dueDate"].asString() } shouldBe listOf(today.toString(), today.toString())
        body["lateCount"].asInt() shouldBe 1 // 2h + 2h > 하루 3h — 두 번째 작업만 가용 시간을 넘어 몰았다
    }

    test("상시(마감 없는) 프로젝트의 작업은 마감일이 없다") {
        val tasks = createOk(newUser(), deadline = null, tasks = listOf(task("a", "꾸준히 할 일", 2.0)))["project"]["tasks"]
        tasks[0]["dueDate"].isNull shouldBe true
    }

    test("프로젝트를 삭제하면 목록·상세·일정에서 사라진다 — 남의 프로젝트는 404") {
        val tokens = newUser()
        val other = newUser()
        val id = createOk(tokens)["project"]["id"].asLong()
        mockMvc.delete("/api/v1/projects/$id") { header("Authorization", api.bearer(other)) }.andExpect { status { isNotFound() } }
        mockMvc.delete("/api/v1/projects/$id") { header("Authorization", api.bearer(tokens)) }.andExpect { status { isNoContent() } }
        mockMvc.get("/api/v1/projects/$id") { header("Authorization", api.bearer(tokens)) }.andExpect { status { isNotFound() } }
        mockMvc.get("/api/v1/projects?status=active") { header("Authorization", api.bearer(tokens)) }.andExpect { jsonPath("$.totalElements") { value(0) } }
        mockMvc.get("/api/v1/schedule") { header("Authorization", api.bearer(tokens)) }.andExpect { jsonPath("$.tasks.length()") { value(0) } }
    }

    test("프로젝트를 삭제하면 남은 작업을 오늘부터 다시 배치한다 — 밀린 작업은 그대로(사용자 결정 2026-10-08)") {
        val tokens = newUser()
        val far = createOk(tokens, name = "먼 마감", deadline = today.plusDays(20), tasks = listOf(task("a", "먼 작업", 3.0), task("b", "밀린 일", 1.0)))["project"]["tasks"]
        val lateId = far[1]["id"].asLong()
        jdbc.update("UPDATE tasks SET scheduled_date = ?, day_hours = '' WHERE id = ?", today.minusDays(2), lateId)
        val near = createOk(tokens, name = "가까운 마감", deadline = today.plusDays(2), tasks = listOf(task("c", "급한 작업", 3.0)))
        // 가까운 마감이 오늘을 차지해 먼 작업은 내일로 밀려 있다
        val before = api.read(mockMvc.get("/api/v1/schedule") { header("Authorization", api.bearer(tokens)) }.andReturn().response.contentAsString)["tasks"]
        before.asIterable().first { it["id"].asLong() == far[0]["id"].asLong() }["scheduledDate"].asString() shouldBe today.plusDays(1).toString()

        mockMvc.delete("/api/v1/projects/${near["project"]["id"].asLong()}") { header("Authorization", api.bearer(tokens)) }.andExpect { status { isNoContent() } }

        val byId = api.read(mockMvc.get("/api/v1/schedule") { header("Authorization", api.bearer(tokens)) }.andReturn().response.contentAsString)["tasks"]
            .asIterable().associateBy { it["id"].asLong() }
        byId.getValue(far[0]["id"].asLong())["scheduledDate"].asString() shouldBe today.toString()
        byId.getValue(lateId)["scheduledDate"].asString() shouldBe today.toString()
        byId.getValue(lateId)["delayedFrom"].asString() shouldBe today.minusDays(2).toString()
    }

    test("두 번째 프로젝트는 첫 프로젝트가 쓴 시간을 피해 배정한다") {
        val tokens = newUser()
        createOk(tokens, tasks = listOf(task("a", "하루 꽉 참", 3.0)))
        val second = createOk(tokens, name = "두 번째", deadline = null, tasks = listOf(task("b", "다음 날로", 1.0)))
        second["project"]["tasks"][0]["scheduledDate"].asString() shouldBe today.plusDays(1).toString()
    }

    test("새 프로젝트를 등록하면 기존 작업도 오늘부터 다시 배치하고, 마감이 가까운 프로젝트를 먼저 채운다") {
        val tokens = newUser()
        val first = createOk(tokens, name = "먼 마감", deadline = today.plusDays(20), tasks = listOf(task("a", "먼 작업", 3.0)))
        first["project"]["tasks"][0]["scheduledDate"].asString() shouldBe today.toString()
        // 마감이 더 가까운 프로젝트가 들어오면 오늘 자리를 가져가고, 먼 작업은 내일로 밀린다
        val second = createOk(tokens, name = "가까운 마감", deadline = today.plusDays(2), tasks = listOf(task("b", "급한 작업", 3.0)))
        second["project"]["tasks"][0]["scheduledDate"].asString() shouldBe today.toString()
        val moved = api.read(mockMvc.get("/api/v1/projects/${first["project"]["id"].asLong()}") { header("Authorization", api.bearer(tokens)) }.andReturn().response.contentAsString)
        moved["tasks"][0]["scheduledDate"].asString() shouldBe today.plusDays(1).toString()
    }

    test("완료한 작업은 다시 배치하지 않는다") {
        val tokens = newUser()
        val doneTask = createOk(tokens, deadline = null, tasks = listOf(task("a", "끝낸 작업", 3.0)))["project"]["tasks"][0]
        mockMvc.patch("/api/v1/tasks/${doneTask["id"].asLong()}") {
            header("Authorization", api.bearer(tokens))
            contentType = MediaType.APPLICATION_JSON
            content = api.json(mapOf("done" to true))
        }
        createOk(tokens, name = "다음", deadline = null, tasks = listOf(task("b", "새 작업", 3.0)))
        val tasks = api.read(mockMvc.get("/api/v1/schedule") { header("Authorization", api.bearer(tokens)) }.andReturn().response.contentAsString)["tasks"]
        tasks.asIterable().associate { it["title"].asString() to it["scheduledDate"].asString() } shouldBe mapOf("끝낸 작업" to today.toString(), "새 작업" to today.toString())
    }

    test("밀린 작업은 오늘로 옮기고 원래 끝나는 날(delayedFrom)을 남긴다 — 옮길 때 다른 작업 배치는 그대로, 다음 등록 때도 밀린 작업은 다시 배치하지 않는다") {
        val tokens = newUser()
        val tasks = createOk(tokens, deadline = null, tasks = listOf(task("a", "어제 할 일", 2.0), task("b", "모레 할 일", 3.0)))["project"]["tasks"]
        val lateId = tasks[0]["id"].asLong()
        val otherId = tasks[1]["id"].asLong()
        jdbc.update("UPDATE tasks SET scheduled_date = ?, span_days = 2, day_hours = '' WHERE id = ?", today.minusDays(3), lateId)
        jdbc.update("UPDATE tasks SET scheduled_date = ?, day_hours = '' WHERE id = ?", today.plusDays(2), otherId)

        val snapshot = api.read(mockMvc.get("/api/v1/schedule") { header("Authorization", api.bearer(tokens)) }.andReturn().response.contentAsString)
        val late = snapshot["tasks"].asIterable().first { it["id"].asLong() == lateId }
        late["scheduledDate"].asString() shouldBe today.toString()
        late["spanDays"].asInt() shouldBe 1
        late["delayedFrom"].asString() shouldBe today.minusDays(2).toString()
        snapshot["tasks"].asIterable().first { it["id"].asLong() == otherId }["scheduledDate"].asString() shouldBe today.plusDays(2).toString()

        // 다음 등록 때: 밀린 작업은 오늘 그대로(추가 작업이라 자리를 차지하지 않음).
        // 나머지는 오늘부터 다시 배치 — 둘 다 마감이 없으니 먼저 등록한 "모레 할 일"이 오늘, 새 작업은 내일
        val next = createOk(tokens, name = "다음", deadline = null, tasks = listOf(task("c", "새 작업", 3.0)))
        next["project"]["tasks"][0]["scheduledDate"].asString() shouldBe today.plusDays(1).toString()
        val after = api.read(mockMvc.get("/api/v1/schedule") { header("Authorization", api.bearer(tokens)) }.andReturn().response.contentAsString)["tasks"]
        after.asIterable().first { it["id"].asLong() == lateId }["scheduledDate"].asString() shouldBe today.toString()
        after.asIterable().first { it["id"].asLong() == otherId }["scheduledDate"].asString() shouldBe today.toString()
    }

    test("작업 다시 배치(설정 버튼): 밀린 작업도 포함해 오늘부터 다시 배치하고 지연 표시는 남긴다, 완료한 작업은 그대로") {
        val tokens = newUser()
        val tasks = createOk(tokens, deadline = null, tasks = listOf(task("a", "밀린 일", 3.0), task("b", "끝낸 일", 1.0), task("c", "다른 일", 3.0)))["project"]["tasks"]
        val lateId = tasks[0]["id"].asLong()
        val doneId = tasks[1]["id"].asLong()
        jdbc.update("UPDATE tasks SET scheduled_date = ?, day_hours = '' WHERE id = ?", today.minusDays(2), lateId)
        jdbc.update("UPDATE tasks SET done = true, scheduled_date = ?, day_hours = '' WHERE id = ?", today.minusDays(5), doneId)
        // 일정을 읽으면 밀린 일이 오늘로 옮겨져 오늘이 몰린다(밀린 일 3h + 다른 일)
        mockMvc.get("/api/v1/schedule") { header("Authorization", api.bearer(tokens)) }

        val body = api.read(mockMvc.post("/api/v1/schedule/replan") { header("Authorization", api.bearer(tokens)) }
            .andExpect { status { isOk() } }.andReturn().response.contentAsString)
        val byTitle = body["tasks"].asIterable().associateBy { it["title"].asString() }
        byTitle.getValue("밀린 일")["scheduledDate"].asString() shouldBe today.toString()
        byTitle.getValue("밀린 일")["delayedFrom"].asString() shouldBe today.minusDays(2).toString()
        byTitle.getValue("다른 일")["scheduledDate"].asString() shouldBe today.plusDays(1).toString()
        byTitle.getValue("끝낸 일")["scheduledDate"].asString() shouldBe today.minusDays(5).toString()
        mockMvc.post("/api/v1/schedule/replan").andExpect { status { isUnauthorized() } }
    }

    test("입력 검증: 이름 없음·작업 없음·없는 색·없는 선행 key·날짜 형식 오류는 400") {
        val tokens = newUser()
        val valid = mapOf("name" to "x", "description" to "", "deadline" to null, "color" to "teal", "tasks" to listOf(task("a", "t", 1.0)))
        for (broken in listOf(
            valid + ("name" to " "),
            valid + ("tasks" to emptyList<Any>()),
            valid + ("color" to "red"),
            // 회색은 뺐다(사용자 결정 2026-10-01)
            valid + ("color" to "gray"),
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
        patch(mapOf("color" to "gray")).andExpect { status { isBadRequest() } }
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
