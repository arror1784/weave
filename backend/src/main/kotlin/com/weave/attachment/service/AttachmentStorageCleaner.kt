package com.weave.attachment.service

import com.weave.attachment.repository.AttachmentRepository
import com.weave.attachment.storage.FileStorage
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/** 탈퇴 시 그 사용자의 첨부 파일을 디스크에서 지운다(§3-17) */
@Service
class AttachmentStorageCleaner(
    private val attachmentRepository: AttachmentRepository,
    private val fileStorage: FileStorage,
) {
    @Transactional(readOnly = true)
    fun deleteFilesOf(userId: Long) {
        attachmentRepository.findByUserId(userId).mapNotNull { it.storageKey }.forEach(fileStorage::delete)
    }
}
