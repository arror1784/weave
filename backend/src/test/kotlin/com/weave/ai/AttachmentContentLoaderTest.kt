package com.weave.ai

import com.weave.TestcontainersConfiguration
import com.weave.ai.service.AttachmentContentLoader
import com.weave.attachment.TestImages
import com.weave.client.AiAttachment
import com.weave.support.ApiTestSupport
import io.kotest.core.extensions.ApplyExtension
import io.kotest.core.spec.style.FunSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.types.shouldBeInstanceOf
import org.apache.poi.hslf.usermodel.HSLFSlideShow
import org.apache.poi.hssf.usermodel.HSSFWorkbook
import org.apache.poi.xwpf.usermodel.XWPFDocument
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.mock.web.MockMultipartFile
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.multipart
import org.springframework.test.web.servlet.post
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper
import java.io.ByteArrayOutputStream
import java.util.Base64
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration::class)
@ApplyExtension(SpringExtension::class)
class AttachmentContentLoaderTest(private val mockMvc: MockMvc, objectMapper: ObjectMapper, loader: AttachmentContentLoader) : FunSpec({
    val api = ApiTestSupport(mockMvc, objectMapper)
    val pdf = "%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF".toByteArray()

    fun upload(tokens: JsonNode, name: String, bytes: ByteArray): Long = api.read(
        mockMvc.multipart("/api/v1/attachments") {
            file(MockMultipartFile("file", name, "application/octet-stream", bytes))
            header("Authorization", api.bearer(tokens))
        }.andReturn().response.contentAsString,
    )["id"].asLong()

    fun docx(text: String): ByteArray = XWPFDocument().use { doc ->
        doc.createParagraph().createRun().setText(text)
        ByteArrayOutputStream().also(doc::write).toByteArray()
    }

    test("PDF·사진은 그대로, txt·Office는 글자로, 링크는 주소로 AI에게 보낼 내용을 만든다 (요청한 순서대로)") {
        val tokens = api.signup("l-${UUID.randomUUID()}@example.com")
        val userId = tokens["user"]["id"].asLong()
        val ids = listOf(
            upload(tokens, "명세서.pdf", pdf),
            upload(tokens, "capture.jpg", TestImages.jpegWithExif()),
            upload(tokens, "메모.txt", "UART는 알고 인터럽트는 처음".toByteArray()),
            upload(tokens, "회의록.docx", docx("보고서와 발표자료를 맡는다")),
            api.read(mockMvc.post("/api/v1/attachments/links") {
                header("Authorization", api.bearer(tokens))
                contentType = MediaType.APPLICATION_JSON
                content = api.json(mapOf("url" to "https://example.com/spec"))
            }.andReturn().response.contentAsString)["id"].asLong(),
        )

        val loaded = loader.load(userId, ids)

        loaded.map { it.title } shouldBe listOf("명세서.pdf", "capture.jpg", "메모.txt", "회의록.docx", "https://example.com/spec")
        loaded[0].shouldBeInstanceOf<AiAttachment.Pdf>().base64 shouldBe Base64.getEncoder().encodeToString(pdf)
        loaded[1].shouldBeInstanceOf<AiAttachment.Image>().mediaType shouldBe "image/jpeg"
        loaded[2].shouldBeInstanceOf<AiAttachment.Text>().text shouldBe "UART는 알고 인터럽트는 처음"
        loaded[3].shouldBeInstanceOf<AiAttachment.Text>().text shouldContain "보고서와 발표자료를 맡는다"
        loaded[4].shouldBeInstanceOf<AiAttachment.Text>().text shouldContain "https://example.com/spec"
    }

    test("넓힌 형식: md·코드는 글자로, gif·webp는 사진으로, 옛 Office(xls·ppt)는 글자를 뽑아서, zip·음성은 볼 수 없다고 알린다") {
        val tokens = api.signup("l-${UUID.randomUUID()}@example.com")
        val userId = tokens["user"]["id"].asLong()
        val xls = HSSFWorkbook().use { wb ->
            wb.createSheet("일정").createRow(0).createCell(0).setCellValue("중간발표 10월 9일")
            ByteArrayOutputStream().also(wb::write).toByteArray()
        }
        val ppt = HSLFSlideShow().use { show ->
            show.createSlide().addTitle().setText("최종 발표 목차")
            ByteArrayOutputStream().also(show::write).toByteArray()
        }
        val ids = listOf(
            upload(tokens, "회의록.md", "# 역할\n- 발표: 나".toByteArray()),
            upload(tokens, "Main.kt", "fun main() = println(1)".toByteArray()),
            upload(tokens, "움짤.gif", TestImages.gif()),
            upload(tokens, "사진.webp", TestImages.webpWithExif()),
            upload(tokens, "표.xls", xls),
            upload(tokens, "발표.ppt", ppt),
            upload(tokens, "소스.zip", byteArrayOf(0x50, 0x4B, 0x03, 0x04, 0, 0)),
            upload(tokens, "녹음.mp3", "ID3".toByteArray() + byteArrayOf(4, 0, 0)),
        )

        val loaded = loader.load(userId, ids)

        loaded[0].shouldBeInstanceOf<AiAttachment.Text>().text shouldBe "# 역할\n- 발표: 나"
        loaded[1].shouldBeInstanceOf<AiAttachment.Text>().text shouldBe "fun main() = println(1)"
        loaded[2].shouldBeInstanceOf<AiAttachment.Image>().mediaType shouldBe "image/gif"
        loaded[3].shouldBeInstanceOf<AiAttachment.Image>().mediaType shouldBe "image/webp"
        loaded[4].shouldBeInstanceOf<AiAttachment.Text>().text shouldContain "중간발표 10월 9일"
        loaded[5].shouldBeInstanceOf<AiAttachment.Text>().text shouldContain "최종 발표 목차"
        loaded[6].shouldBeInstanceOf<AiAttachment.Text>().text shouldBe "(압축 파일은 AI가 볼 수 없어요)"
        loaded[7].shouldBeInstanceOf<AiAttachment.Text>().text shouldBe "(음성 파일은 AI가 들을 수 없어요)"
    }

    test("남의 첨부 id는 넣지 않는다") {
        val owner = api.signup("l-${UUID.randomUUID()}@example.com")
        val other = api.signup("l-${UUID.randomUUID()}@example.com")
        val id = upload(owner, "spec.pdf", pdf)
        loader.load(other["user"]["id"].asLong(), listOf(id)) shouldBe emptyList()
    }
})
