package com.weave.attachment.service

import com.weave.attachment.repository.AttachmentRepository
import com.weave.attachment.storage.FileStorage
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Duration

/**
 * 등록을 그만둬 프로젝트에 연결되지 않은 첨부 정리 — 24시간 보관, 하루에 한 번(새벽 4시, 한국 시간) 지운다(사용자 결정 2026-10-01).
 */
@Service
class OrphanAttachmentCleaner(
    private val attachmentRepository: AttachmentRepository,
    private val fileStorage: FileStorage,
    private val clock: Clock,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Scheduled(cron = "0 0 4 * * *", zone = "Asia/Seoul")
    @Transactional
    fun cleanUp() {
        val orphans = attachmentRepository.findByProjectIdIsNullAndCreatedAtBefore(clock.instant().minus(KEEP))
        orphans.forEach { a -> a.storageKey?.let(fileStorage::delete) }
        if (orphans.isNotEmpty()) attachmentRepository.hardDeleteByIdIn(orphans.map { it.id!! })
        log.info("연결 안 된 첨부 {}개 정리", orphans.size)
    }

    companion object {
        val KEEP: Duration = Duration.ofHours(24)
    }
}
