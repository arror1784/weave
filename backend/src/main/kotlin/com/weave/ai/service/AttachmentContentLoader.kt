package com.weave.ai.service

import com.weave.attachment.domain.Attachment
import com.weave.attachment.repository.AttachmentRepository
import com.weave.attachment.service.FileType
import com.weave.attachment.storage.FileStorage
import com.weave.client.AiAttachment
import kr.dogfoot.hwplib.reader.HWPReader
import kr.dogfoot.hwpxlib.reader.HWPXReader
import kr.dogfoot.hwpxlib.tool.textextractor.TextMarks
import org.apache.poi.extractor.ExtractorFactory
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.nio.file.Files
import java.util.Base64
import kr.dogfoot.hwplib.tool.textextractor.TextExtractMethod as HwpMethod
import kr.dogfoot.hwplib.tool.textextractor.TextExtractor as HwpExtractor
import kr.dogfoot.hwpxlib.tool.textextractor.TextExtractMethod as HwpxMethod
import kr.dogfoot.hwpxlib.tool.textextractor.TextExtractor as HwpxExtractor

/**
 * 첨부를 AI에게 보낼 내용으로 바꾼다(사용자 결정 2026-10-01: 첨부는 AI에게 보낸다).
 * PDF·사진(jpg·png)은 그대로, txt는 글자로, Office(docx·pptx·xlsx)·한글(hwp·hwpx)은 서버가 글자를 뽑아서, 링크는 주소만.
 */
@Service
class AttachmentContentLoader(
    private val attachmentRepository: AttachmentRepository,
    private val fileStorage: FileStorage,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    /** 본인 첨부만, 요청한 순서대로 */
    @Transactional(readOnly = true)
    fun load(userId: Long, ids: List<Long>): List<AiAttachment> {
        if (ids.isEmpty()) return emptyList()
        val byId = attachmentRepository.findByIdInAndUserId(ids.toSet(), userId).associateBy { it.id!! }
        var binaryBytes = 0L
        return ids.mapNotNull(byId::get).map { a ->
            val content = toContent(a)
            // 요청 크기 보호: 원본째 보내는 PDF·사진은 합쳐서 20MB까지
            if (content is AiAttachment.Pdf || content is AiAttachment.Image) {
                binaryBytes += a.sizeBytes ?: 0
                if (binaryBytes > MAX_BINARY_BYTES) return@map AiAttachment.Text(a.name, "(파일이 커서 AI에게 보내지 못했어요)")
            }
            content
        }
    }

    private fun toContent(a: Attachment): AiAttachment {
        if (a.kind == Attachment.LINK) return AiAttachment.Text(a.name, "참고 링크: ${a.url} (링크의 내용은 열어 보지 않았어요)")
        val bytes = fileStorage.read(a.storageKey!!)
        val type = FileType.entries.firstOrNull { it.contentType == a.contentType }
        return try {
            when (type) {
                FileType.PDF -> AiAttachment.Pdf(a.name, base64(bytes))
                FileType.JPEG, FileType.PNG -> AiAttachment.Image(a.name, base64(bytes), type.contentType)
                FileType.HEIC -> AiAttachment.Text(a.name, "(HEIC 사진은 AI가 볼 수 없어요)")
                FileType.TXT -> text(a, String(bytes, Charsets.UTF_8))
                FileType.DOCX, FileType.PPTX, FileType.XLSX -> text(a, ExtractorFactory.createExtractor(bytes.inputStream()).use { it.text })
                FileType.HWP -> text(a, HwpExtractor.extract(HWPReader.fromInputStream(bytes.inputStream()), HwpMethod.InsertControlTextBetweenParagraphText))
                FileType.HWPX -> text(a, extractHwpx(bytes))
                null -> AiAttachment.Text(a.name, "(읽을 수 없는 형식이에요)")
            }
        } catch (e: Exception) {
            // 파일 내용은 로그에 남기지 않는다(§3-16)
            log.warn("첨부 내용 읽기 실패: {} ({})", a.id, e.javaClass.simpleName)
            AiAttachment.Text(a.name, "(내용을 읽지 못했어요)")
        }
    }

    /** hwpxlib는 파일 경로로만 읽는다 — 임시 파일을 거친다 */
    private fun extractHwpx(bytes: ByteArray): String {
        val temp = Files.createTempFile("weave-", ".hwpx")
        return try {
            Files.write(temp, bytes)
            HwpxExtractor.extract(HWPXReader.fromFilepath(temp.toString()), HwpxMethod.InsertControlTextBetweenParagraphText, false, TextMarks())
        } finally {
            Files.deleteIfExists(temp)
        }
    }

    private fun text(a: Attachment, raw: String): AiAttachment.Text {
        val trimmed = raw.trim()
        return AiAttachment.Text(a.name, if (trimmed.length > MAX_TEXT_CHARS) trimmed.take(MAX_TEXT_CHARS) + "\n(이하 생략)" else trimmed)
    }

    private fun base64(bytes: ByteArray) = Base64.getEncoder().encodeToString(bytes)

    companion object {
        /** 파일 하나에서 AI에게 보내는 글자 수 */
        const val MAX_TEXT_CHARS = 50_000

        /** 원본째 보내는 PDF·사진 합계 (Claude 요청 크기 한도 32MB 아래로) */
        const val MAX_BINARY_BYTES = 20L * 1024 * 1024
    }
}
