package com.weave.attachment

import com.weave.TestcontainersConfiguration
import com.weave.attachment.service.OrphanAttachmentCleaner
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
class AttachmentIntegrationTest(
    private val mockMvc: MockMvc,
    objectMapper: ObjectMapper,
    jdbc: JdbcTemplate,
    cleaner: OrphanAttachmentCleaner,
) : FunSpec({
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

    test("넓힌 형식(글자·코드·gif·webp·옛 Office·zip·음성)을 받고, 글자 파일은 text/plain으로 내려준다") {
        val tokens = newUser()
        val ole = byteArrayOf(0xD0.toByte(), 0xCF.toByte(), 0x11, 0xE0.toByte(), 0xA1.toByte(), 0xB1.toByte(), 0x1A, 0xE1.toByte(), 0, 0)
        val zip = byteArrayOf(0x50, 0x4B, 0x03, 0x04, 0, 0)
        val ftypM4a = byteArrayOf(0, 0, 0, 0x20) + "ftypM4A ".toByteArray()
        val wav = "RIFF".toByteArray() + byteArrayOf(4, 0, 0, 0) + "WAVEfmt ".toByteArray()
        val accepted = mapOf(
            "회의록.md" to ("# 회의\n- 발표 준비".toByteArray() to "text/plain"),
            "data.csv" to ("a,b\n1,2".toByteArray() to "text/plain"),
            "Main.java" to ("class Main {}".toByteArray() to "text/plain"),
            "config.yaml" to ("a: 1".toByteArray() to "text/plain"),
            "움짤.gif" to (TestImages.gif() to "image/gif"),
            "사진.webp" to (TestImages.webpWithExif() to "image/webp"),
            "옛문서.doc" to (ole to "application/msword"),
            "표.xls" to (ole to "application/vnd.ms-excel"),
            "발표.ppt" to (ole to "application/vnd.ms-powerpoint"),
            "소스.zip" to (zip to "application/zip"),
            "녹음.mp3" to ("ID3".toByteArray() + byteArrayOf(4, 0, 0) to "audio/mpeg"),
            "녹음.m4a" to (ftypM4a to "audio/mp4"),
            "녹음.wav" to (wav to "audio/wav"),
        )
        accepted.forEach { (name, file) ->
            val body = api.read(upload(tokens, name, file.first).andExpect { status { isCreated() } }.andReturn().response.contentAsString)
            body["contentType"].asString() shouldBe file.second
        }
    }

    test("webp는 저장 전에 위치(EXIF)·XMP를 지운다") {
        val body = api.read(upload(newUser(), "사진.webp", TestImages.webpWithExif()).andExpect { status { isCreated() } }.andReturn().response.contentAsString)
        body["kind"].asString() shouldBe "image"
        val saved = Files.readAllBytes(storageRoot.resolve(storageKeyOf(body["id"].asLong())))
        String(saved, Charsets.ISO_8859_1).contains("GPS") shouldBe false
    }

    test("실행 파일·스크립트·html·영상은 계속 400") {
        val tokens = newUser()
        listOf("run.sh" to "#!/bin/sh".toByteArray(), "run.bat" to "echo".toByteArray(), "app.apk" to byteArrayOf(0x50, 0x4B, 0x03, 0x04),
            "page.html" to "<script>".toByteArray(), "image.svg" to "<svg/>".toByteArray(),
            "clip.mp4" to byteArrayOf(0, 0, 0, 0x20) + "ftypisom".toByteArray()).forEach { (name, bytes) ->
            upload(tokens, name, bytes).andExpect { status { isBadRequest() }; jsonPath("$.code") { value("UNSUPPORTED_FILE") } }
        }
    }

    test("확장자는 맞아도 내용이 다르면 400 (글자 파일에 NUL, gif가 아닌 gif)") {
        val tokens = newUser()
        upload(tokens, "bin.md", byteArrayOf(0x41, 0, 0x42)).andExpect { status { isBadRequest() } }
        upload(tokens, "fake.gif", "not gif".toByteArray()).andExpect { status { isBadRequest() } }
        upload(tokens, "fake.wav", "RIFF\u0004\u0000\u0000\u0000WEBP".toByteArray()).andExpect { status { isBadRequest() } }
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

    test("내 첨부 파일은 내려받을 수 있다(원래 이름·형식으로), 남의 것과 링크는 404") {
        val tokens = newUser()
        val other = newUser()
        val id = api.read(upload(tokens, "명세서.pdf", pdf).andReturn().response.contentAsString)["id"].asLong()
        val response = mockMvc.get("/api/v1/attachments/$id/content") { header("Authorization", api.bearer(tokens)) }
            .andExpect {
                status { isOk() }
                content { contentType("application/pdf") }
                header { string("Content-Disposition", org.hamcrest.Matchers.containsString("filename*=UTF-8''%EB%AA%85%EC%84%B8%EC%84%9C.pdf")) }
            }.andReturn().response
        response.contentAsByteArray.contentEquals(pdf) shouldBe true
        mockMvc.get("/api/v1/attachments/$id/content") { header("Authorization", api.bearer(other)) }.andExpect { status { isNotFound() } }
        val link = api.read(mockMvc.post("/api/v1/attachments/links") {
            header("Authorization", api.bearer(tokens))
            contentType = MediaType.APPLICATION_JSON
            content = api.json(mapOf("url" to "https://example.com"))
        }.andReturn().response.contentAsString)["id"].asLong()
        mockMvc.get("/api/v1/attachments/$link/content") { header("Authorization", api.bearer(tokens)) }.andExpect { status { isNotFound() } }
    }

    test("하루에 한 번 정리: 프로젝트에 연결되지 않고 24시간 지난 첨부만 파일과 함께 지운다") {
        val tokens = newUser()
        val oldOrphan = api.read(upload(tokens, "old.pdf", pdf).andReturn().response.contentAsString)["id"].asLong()
        val freshOrphan = api.read(upload(tokens, "fresh.pdf", pdf).andReturn().response.contentAsString)["id"].asLong()
        val linked = api.read(upload(tokens, "linked.pdf", pdf).andReturn().response.contentAsString)["id"].asLong()
        mockMvc.post("/api/v1/projects") {
            header("Authorization", api.bearer(tokens))
            contentType = MediaType.APPLICATION_JSON
            content = api.json(mapOf("name" to "x", "color" to "teal", "tasks" to listOf(mapOf("key" to "a", "title" to "t", "estimatedHours" to 1.0)), "attachmentIds" to listOf(linked)))
        }.andExpect { status { isCreated() } }
        val oldKey = storageKeyOf(oldOrphan)
        jdbc.update("UPDATE attachments SET created_at = now() - interval '25 hours' WHERE id IN (?, ?)", oldOrphan, linked)

        cleaner.cleanUp()

        jdbc.queryForObject("SELECT count(*) FROM attachments WHERE id = ?", Long::class.java, oldOrphan) shouldBe 0L
        Files.exists(storageRoot.resolve(oldKey)) shouldBe false
        jdbc.queryForObject("SELECT count(*) FROM attachments WHERE id IN (?, ?)", Long::class.java, freshOrphan, linked) shouldBe 2L
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
