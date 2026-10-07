package com.weave.attachment.service

import com.drew.imaging.ImageMetadataReader
import com.weave.activity.domain.ActivityType
import com.weave.activity.service.ActivityRecorder
import com.drew.metadata.exif.GpsDirectory
import com.weave.attachment.domain.Attachment
import com.weave.attachment.dto.AttachmentResponse
import com.weave.attachment.repository.AttachmentRepository
import com.weave.attachment.storage.FileStorage
import com.weave.global.error.ApiException
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionSynchronization
import org.springframework.transaction.support.TransactionSynchronizationManager
import org.springframework.web.multipart.MultipartFile
import java.net.URLDecoder
import java.text.Normalizer
import java.util.UUID

@Service
class AttachmentService(
    private val attachmentRepository: AttachmentRepository,
    private val fileStorage: FileStorage,
    private val activityRecorder: ActivityRecorder,
) {
    /** 파일·사진 올리기: 형식 확인 → 사진 메타데이터 제거 → 서버가 만든 이름으로 저장 */
    @Transactional
    fun upload(userId: Long, file: MultipartFile): AttachmentResponse {
        if (file.size > MAX_BYTES) throw ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE", "파일은 10MB까지 올릴 수 있어요.")
        if (file.isEmpty) throw ApiException(HttpStatus.BAD_REQUEST, "EMPTY_FILE", "빈 파일이에요.")
        val name = displayName(file.originalFilename)
        val type = FileType.ofExtension(name.substringAfterLast('.', ""))
        val bytes = file.bytes
        if (type == null || !type.matches(bytes)) throw unsupported()

        val cleaned = try {
            when (type) {
                FileType.JPEG -> ImageMetadataStripper.stripJpeg(bytes)
                FileType.PNG -> ImageMetadataStripper.stripPng(bytes)
                FileType.WEBP -> ImageMetadataStripper.stripWebp(bytes)
                FileType.HEIC -> bytes.also { rejectIfHasLocation(it) }
                else -> bytes
            }
        } catch (e: IllegalArgumentException) {
            throw unsupported()
        }

        val key = "${UUID.randomUUID()}.${type.extensions.first()}"
        fileStorage.save(key, cleaned)
        // DB 저장이 실패하면 방금 쓴 파일도 지운다
        afterRollback { fileStorage.delete(key) }
        val saved = attachmentRepository.save(
            Attachment(userId, if (type.image) Attachment.IMAGE else Attachment.FILE, name, storageKey = key, contentType = type.contentType, sizeBytes = cleaned.size.toLong()),
        )
        activityRecorder.record(userId, ActivityType.ATTACHMENT_UPLOADED, detail = mapOf("attachmentId" to saved.id, "name" to name, "contentType" to type.contentType, "size" to cleaned.size.toLong()))
        return AttachmentResponse.of(saved)
    }

    @Transactional
    fun addLink(userId: Long, url: String): AttachmentResponse {
        val saved = attachmentRepository.save(Attachment(userId, Attachment.LINK, url.take(300), url = url))
        activityRecorder.record(userId, ActivityType.ATTACHMENT_LINK_ADDED, detail = mapOf("attachmentId" to saved.id, "url" to url))
        return AttachmentResponse.of(saved)
    }

    /** 내 첨부 파일 내려받기 — 링크·남의 첨부는 404 */
    @Transactional(readOnly = true)
    fun download(userId: Long, id: Long): Pair<Attachment, ByteArray> {
        val attachment = attachmentRepository.findByIdInAndUserId(listOf(id), userId).firstOrNull()?.takeIf { it.storageKey != null }
            ?: throw ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "첨부를 찾을 수 없어요.")
        return attachment to fileStorage.read(attachment.storageKey!!)
    }

    /** 내 첨부 지우기 — 행은 소프트 삭제, 파일은 디스크에서 지운다 */
    @Transactional
    fun delete(userId: Long, id: Long) {
        val attachment = attachmentRepository.findByIdInAndUserId(listOf(id), userId).firstOrNull()
            ?: throw ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "첨부를 찾을 수 없어요.")
        attachment.storageKey?.let(fileStorage::delete)
        attachmentRepository.delete(attachment)
        activityRecorder.record(userId, ActivityType.ATTACHMENT_DELETED, projectId = attachment.projectId, detail = mapOf("attachmentId" to attachment.id, "name" to attachment.name, "kind" to attachment.kind))
    }

    /**
     * HEIC은 메타데이터를 안전하게 지우는 방법(라이브러리)이 없어, 위치 정보가 있으면 받지 않는다(§3-9).
     * 앱은 사진을 JPEG로 바꿔 보내므로 보통은 여기까지 오지 않는다.
     */
    private fun rejectIfHasLocation(bytes: ByteArray) {
        val metadata = runCatching { ImageMetadataReader.readMetadata(bytes.inputStream()) }.getOrNull() ?: throw unsupported()
        if (metadata.getDirectoriesOfType(GpsDirectory::class.java).any { it.tagCount > 0 }) {
            throw ApiException(HttpStatus.BAD_REQUEST, "IMAGE_HAS_LOCATION", "위치 정보가 담긴 HEIC 사진은 올릴 수 없어요. JPG로 바꿔서 올려 주세요.")
        }
    }

    private fun afterRollback(action: () -> Unit) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) return
        TransactionSynchronizationManager.registerSynchronization(object : TransactionSynchronization {
            override fun afterCompletion(status: Int) {
                if (status == TransactionSynchronization.STATUS_ROLLED_BACK) action()
            }
        })
    }

    private fun unsupported() = ApiException(HttpStatus.BAD_REQUEST, "UNSUPPORTED_FILE", "올릴 수 없는 파일 형식이에요. 실행 파일·영상은 받지 않아요.")

    companion object {
        /** 사용자 결정: 파일당 10MB */
        const val MAX_BYTES = 10L * 1024 * 1024

        /** 경로를 떼고 이름만, 300자까지 — 보여주기용일 뿐 저장 경로엔 쓰지 않는다 */
        private val PERCENT_ENCODED = Regex("%[0-9A-Fa-f]{2}")

        /**
         * 보여줄 파일 이름. 앱(Expo의 fetch)은 파일 이름을 encodeURIComponent로 보내서 한글이 %EA%B0%80처럼 온다 — 되돌린다.
         * 폰은 한글을 자모로 분해한(NFD) 이름을 줄 때가 있어 합친다(NFC). 되돌릴 수 없는 이름('100%.pdf' 등)은 그대로 둔다.
         */
        fun displayName(original: String?): String {
            val raw = (original ?: "file").substringAfterLast('/').substringAfterLast('\\')
            val decoded = if (PERCENT_ENCODED.containsMatchIn(raw)) {
                runCatching { URLDecoder.decode(raw.replace("+", "%2B"), Charsets.UTF_8) }.getOrDefault(raw)
            } else {
                raw
            }
            return Normalizer.normalize(decoded, Normalizer.Form.NFC).trim().ifEmpty { "file" }.take(300)
        }
    }
}
