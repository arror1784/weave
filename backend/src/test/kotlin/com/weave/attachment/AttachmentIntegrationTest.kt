package com.weave.attachment

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
import org.springframework.mock.web.MockMultipartFile
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.multipart
import org.springframework.test.web.servlet.post
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper
import java.nio.file.Files
import java.nio.file.Path
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration::class)
@ApplyExtension(SpringExtension::class)
class AttachmentIntegrationTest(private val mockMvc: MockMvc, objectMapper: ObjectMapper, jdbc: JdbcTemplate) : FunSpec({
    val api = ApiTestSupport(mockMvc, objectMapper)
    val storageRoot = Path.of("build/test-uploads").toAbsolutePath()
    val pdf = "%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF".toByteArray()
    fun newUser() = api.signup("a-${UUID.randomUUID()}@example.com")

    fun upload(tokens: JsonNode, name: String, bytes: ByteArray, type: String = "application/octet-stream") =
        mockMvc.multipart("/api/v1/attachments") {
            file(MockMultipartFile("file", name, type, bytes))
            header("Authorization", api.bearer(tokens))
        }

    fun storageKeyOf(id: Long): String = jdbc.queryForObject("SELECT storage_key FROM attachments WHERE id = ?", String::class.java, id)!!

    test("PDF를 올리면 201과 첨부 정보(kind=file, 서버가 정한 형식·크기)를 돌려주고 디스크에 서버가 만든 이름으로 저장한다") {
        val body = api.read(upload(newUser(), "../../명세서.pdf", pdf).andExpect { status { isCreated() } }.andReturn().response.contentAsString)
        body["kind"].asString() shouldBe "file"
        body["name"].asString() shouldBe "명세서.pdf"
        body["contentType"].asString() shouldBe "application/pdf"
        body["size"].asLong() shouldBe pdf.size.toLong()
        val key = storageKeyOf(body["id"].asLong())
        key.contains("명세서") shouldBe false
        Files.exists(storageRoot.resolve(key)) shouldBe true
    }

    test("사진(JPEG)은 kind=image로 받고, 저장 전에 EXIF(위치 등)를 지운다") {
        val body = api.read(upload(newUser(), "capture.jpg", TestImages.jpegWithExif(), "image/jpeg").andExpect { status { isCreated() } }.andReturn().response.contentAsString)
        body["kind"].asString() shouldBe "image"
        val saved = Files.readAllBytes(storageRoot.resolve(storageKeyOf(body["id"].asLong())))
        String(saved, Charsets.ISO_8859_1).contains("GPS") shouldBe false
    }

    test("허용하지 않는 확장자, 확장자와 내용이 다른 파일, 빈 파일은 400") {
        val tokens = newUser()
        upload(tokens, "virus.exe", byteArrayOf(0x4D, 0x5A, 0, 0)).andExpect { status { isBadRequest() }; jsonPath("$.code") { value("UNSUPPORTED_FILE") } }
        upload(tokens, "fake.pdf", "not a pdf".toByteArray()).andExpect { status { isBadRequest() }; jsonPath("$.code") { value("UNSUPPORTED_FILE") } }
        upload(tokens, "empty.txt", ByteArray(0)).andExpect { status { isBadRequest() } }
    }

    test("10MB를 넘는 파일은 413") {
        upload(newUser(), "big.pdf", pdf + ByteArray(10 * 1024 * 1024)).andExpect { status { isPayloadTooLarge() } }
    }

    test("링크는 http(s) 주소만 받는다") {
        val tokens = newUser()
        val link = { url: String ->
            mockMvc.post("/api/v1/attachments/links") {
                header("Authorization", api.bearer(tokens))
                contentType = MediaType.APPLICATION_JSON
                content = api.json(mapOf("url" to url))
            }
        }
        link("https://example.com/spec").andExpect { status { isCreated() }; jsonPath("$.kind") { value("link") }; jsonPath("$.url") { value("https://example.com/spec") } }
        link("javascript:alert(1)").andExpect { status { isBadRequest() } }
        link("example.com").andExpect { status { isBadRequest() } }
    }

    test("프로젝트를 등록할 때 첨부 id를 넘기면 연결되고, 남의 첨부 id면 400") {
        val tokens = newUser()
        val other = newUser()
        val mine = api.read(upload(tokens, "spec.pdf", pdf).andReturn().response.contentAsString)["id"].asLong()
        val theirs = api.read(upload(other, "spec.pdf", pdf).andReturn().response.contentAsString)["id"].asLong()
        val body = { ids: List<Long> ->
            mapOf("name" to "x", "color" to "teal", "tasks" to listOf(mapOf("key" to "a", "title" to "t", "estimatedHours" to 1.0)), "attachmentIds" to ids)
        }
        mockMvc.post("/api/v1/projects") {
            header("Authorization", api.bearer(tokens))
            contentType = MediaType.APPLICATION_JSON
            content = api.json(body(listOf(theirs)))
        }.andExpect { status { isBadRequest() } }
        val created = api.read(mockMvc.post("/api/v1/projects") {
            header("Authorization", api.bearer(tokens))
            contentType = MediaType.APPLICATION_JSON
            content = api.json(body(listOf(mine)))
        }.andExpect { status { isCreated() } }.andReturn().response.contentAsString)
        created["project"]["attachments"][0]["id"].asLong() shouldBe mine
        mockMvc.get("/api/v1/projects/${created["project"]["id"].asLong()}") { header("Authorization", api.bearer(tokens)) }
            .andExpect { jsonPath("$.attachments[0].name") { value("spec.pdf") } }
    }

    test("내 첨부는 지울 수 있고(파일도 삭제), 남의 첨부는 404") {
        val tokens = newUser()
        val other = newUser()
        val id = api.read(upload(tokens, "spec.pdf", pdf).andReturn().response.contentAsString)["id"].asLong()
        val key = storageKeyOf(id)
        mockMvc.delete("/api/v1/attachments/$id") { header("Authorization", api.bearer(other)) }.andExpect { status { isNotFound() } }
        mockMvc.delete("/api/v1/attachments/$id") { header("Authorization", api.bearer(tokens)) }.andExpect { status { isNoContent() } }
        Files.exists(storageRoot.resolve(key)) shouldBe false
    }

    test("탈퇴하면 첨부 행과 파일이 실제로 지워진다") {
        val tokens = newUser()
        val id = api.read(upload(tokens, "spec.pdf", pdf).andReturn().response.contentAsString)["id"].asLong()
        val key = storageKeyOf(id)
        mockMvc.delete("/api/v1/me") { header("Authorization", api.bearer(tokens)) }.andExpect { status { isNoContent() } }
        Files.exists(storageRoot.resolve(key)) shouldBe false
        jdbc.queryForObject("SELECT count(*) FROM attachments WHERE id = ?", Long::class.java, id) shouldBe 0L
    }
})
