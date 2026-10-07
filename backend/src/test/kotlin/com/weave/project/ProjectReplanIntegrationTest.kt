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
import org.springframework.mock.web.MockMultipartFile
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.multipart
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

/** "AI에게 재요청" — `POST /projects/{id}/replan-tasks`(backend 규칙 8: PUT 금지). 기존 프로젝트의 기본 정보를 그대로 가져와 AI와 다시 나누고, 확정하면 같은 프로젝트의 미완료 작업을 바꾼다(사용자 결정 2026-10-02) */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration::class)
@ApplyExtension(SpringExtension::class)
class ProjectReplanIntegrationTest(private val mockMvc: MockMvc, objectMapper: ObjectMapper) : FunSpec({
    val api = ApiTestSupport(mockMvc, objectMapper)
    val today = java.time.LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusHours(6).toLocalDate()
    val pdf = "%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF".toByteArray()
    fun newUser() = api.signup("r-${UUID.randomUUID()}@example.com")

    fun task(key: String, title: String, hours: Double, dependsOn: String? = null) =
        mapOf("key" to key, "title" to title, "description" to "", "estimatedHours" to hours, "dependsOnKey" to dependsOn, "prerequisite" to false)

    fun body(name: String, tasks: List<Map<String, Any?>>, attachmentIds: List<Long> = emptyList(), deadline: LocalDate? = today.plusDays(9), color: String = "teal") = mapOf(
        "name" to name, "description" to "설명", "deadline" to deadline?.toString(), "color" to color,
        "deliverable" to "보고서, 발표자료", "progress" to "주제발표 진행", "tasks" to tasks, "attachmentIds" to attachmentIds,
    )

    fun upload(tokens: JsonNode, name: String): Long = api.read(
        mockMvc.multipart("/api/v1/attachments") {
            file(MockMultipartFile("file", name, "application/pdf", pdf))
            header("Authorization", api.bearer(tokens))
        }.andReturn().response.contentAsString,
    )["id"].asLong()

    fun create(tokens: JsonNode, body: Map<String, Any?>): JsonNode = api.read(
        mockMvc.post("/api/v1/projects") {
            header("Authorization", api.bearer(tokens))
            contentType = MediaType.APPLICATION_JSON
            content = api.json(body)
        }.andExpect { status { isCreated() } }.andReturn().response.contentAsString,
    )["project"]

    fun replan(tokens: JsonNode, id: Long, body: Map<String, Any?>) = mockMvc.post("/api/v1/projects/$id/replan-tasks") {
        header("Authorization", api.bearer(tokens))
        contentType = MediaType.APPLICATION_JSON
        content = api.json(body)
    }

    fun markDone(tokens: JsonNode, taskId: Long) = mockMvc.patch("/api/v1/tasks/$taskId") {
        header("Authorization", api.bearer(tokens))
        contentType = MediaType.APPLICATION_JSON
        content = api.json(mapOf("done" to true))
    }

    fun detail(tokens: JsonNode, id: Long) = api.read(mockMvc.get("/api/v1/projects/$id") { header("Authorization", api.bearer(tokens)) }.andReturn().response.contentAsString)

    test("등록 때 결과물 형태·기 진행사항을 저장하고 상세에서 돌려준다") {
        val tokens = newUser()
        val id = create(tokens, body("임베디드", listOf(task("a", "설계", 2.0))))["id"].asLong()
        val project = detail(tokens, id)
        project["deliverable"].asString() shouldBe "보고서, 발표자료"
        project["progress"].asString() shouldBe "주제발표 진행"
    }

    test("재요청 확정: 기본 정보를 바꾸고, 완료한 작업은 남기고 미완료 작업만 새 작업으로 바꿔 다시 배치한다") {
        val tokens = newUser()
        val created = create(tokens, body("임베디드", listOf(task("a", "끝낸 설계", 1.0), task("b", "옛 구현", 3.0), task("c", "옛 발표", 2.0, "b"))))
        val id = created["id"].asLong()
        val doneId = created["tasks"][0]["id"].asLong()
        markDone(tokens, doneId)

        val response = api.read(
            replan(tokens, id, body("임베디드 중간발표", listOf(task("n1", "새 구현", 2.0), task("n2", "새 발표", 1.5, "n1")), deadline = today.plusDays(5), color = "blue"))
                .andExpect { status { isOk() } }.andReturn().response.contentAsString,
        )
        response["lateCount"].asInt() shouldBe 0
        val project = response["project"]
        project["id"].asLong() shouldBe id
        project["name"].asString() shouldBe "임베디드 중간발표"
        project["deadline"].asString() shouldBe today.plusDays(5).toString()
        project["color"].asString() shouldBe "blue"
        project["deliverable"].asString() shouldBe "보고서, 발표자료"

        val tasks = project["tasks"].asIterable().toList()
        tasks.map { it["title"].asString() } shouldBe listOf("끝낸 설계", "새 구현", "새 발표")
        tasks[0]["id"].asLong() shouldBe doneId
        tasks[0]["done"].asBoolean() shouldBe true
        tasks[2]["dependsOnId"].asLong() shouldBe tasks[1]["id"].asLong()
        tasks[1]["scheduledDate"].asString() shouldBe today.toString()

        // 일정에서도 옛 작업은 사라진다
        val titles = api.read(mockMvc.get("/api/v1/schedule") { header("Authorization", api.bearer(tokens)) }.andReturn().response.contentAsString)["tasks"]
            .asIterable().map { it["title"].asString() }
        titles.toSet() shouldBe setOf("끝낸 설계", "새 구현", "새 발표")
    }

    test("재요청 첨부: 남긴 첨부는 그대로, 새로 올린 첨부는 연결, 목록에서 뺀 첨부는 지운다") {
        val tokens = newUser()
        val keep = upload(tokens, "보고서-v1.pdf")
        val drop = upload(tokens, "옛 자료.pdf")
        val id = create(tokens, body("임베디드", listOf(task("a", "설계", 2.0)), attachmentIds = listOf(keep, drop)))["id"].asLong()
        val added = upload(tokens, "발표자료.pdf")

        replan(tokens, id, body("임베디드", listOf(task("a", "설계", 2.0)), attachmentIds = listOf(keep, added))).andExpect { status { isOk() } }

        detail(tokens, id)["attachments"].asIterable().map { it["name"].asString() } shouldBe listOf("보고서-v1.pdf", "발표자료.pdf")
        mockMvc.get("/api/v1/attachments/$drop/content") { header("Authorization", api.bearer(tokens)) }.andExpect { status { isNotFound() } }
    }

    test("남의 프로젝트는 404, 남의 첨부·다른 프로젝트 첨부는 400, 완료한 프로젝트는 409, 입력 검증은 등록과 같다") {
        val tokens = newUser()
        val other = newUser()
        val id = create(tokens, body("내 것", listOf(task("a", "설계", 2.0))))["id"].asLong()
        val otherProject = create(tokens, body("다른 프로젝트", listOf(task("a", "x", 1.0)), attachmentIds = listOf(upload(tokens, "a.pdf"))))
        val ok = body("바꿈", listOf(task("a", "설계", 2.0)))

        replan(other, id, ok).andExpect { status { isNotFound() } }
        replan(tokens, id, ok + ("attachmentIds" to listOf(upload(other, "남의 것.pdf")))).andExpect { status { isBadRequest() } }
        replan(tokens, id, ok + ("attachmentIds" to listOf(otherProject["attachments"][0]["id"].asLong()))).andExpect { status { isBadRequest() } }
        replan(tokens, id, ok + ("tasks" to emptyList<Any>())).andExpect { status { isBadRequest() } }
        replan(tokens, id, ok + ("tasks" to listOf(task("a", "설계", 2.0, "없음")))).andExpect { status { isBadRequest() } }

        mockMvc.patch("/api/v1/projects/$id") {
            header("Authorization", api.bearer(tokens))
            contentType = MediaType.APPLICATION_JSON
            content = api.json(mapOf("status" to "done"))
        }
        replan(tokens, id, ok).andExpect { status { isConflict() } }
    }

    test("재요청 확정은 POST /projects/{id}/replan-tasks — PUT /projects/{id}는 받지 않는다(규칙 8)") {
        val tokens = newUser()
        val id = create(tokens, body("임베디드", listOf(task("a", "설계", 2.0))))["id"].asLong()
        mockMvc.put("/api/v1/projects/$id") {
            header("Authorization", api.bearer(tokens))
            contentType = MediaType.APPLICATION_JSON
            content = api.json(body("바꿈", listOf(task("a", "설계", 2.0))))
        }.andExpect { status { isMethodNotAllowed() } }
    }
})
