package com.weave.attachment.service

import com.weave.attachment.dto.AttachmentResponse
import com.weave.attachment.repository.AttachmentRepository
import com.weave.attachment.storage.FileStorage
import com.weave.global.error.ApiException
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/** 프로젝트 등록 때 미리 올린 첨부를 프로젝트에 연결한다 */
@Service
class AttachmentLinker(
    private val attachmentRepository: AttachmentRepository,
    private val fileStorage: FileStorage,
) {

    /** 본인 것이고 아직 연결되지 않은 첨부만 연결한다. 하나라도 아니면 400 */
    @Transactional
    fun link(userId: Long, ids: List<Long>, projectId: Long) {
        if (ids.isEmpty()) return
        val found = attachmentRepository.findByIdInAndUserId(ids.toSet(), userId)
        if (found.size != ids.toSet().size || found.any { it.projectId != null }) {
            throw ApiException(HttpStatus.BAD_REQUEST, "INVALID_ATTACHMENT", "첨부를 찾을 수 없어요. 다시 올려 주세요.")
        }
        found.forEach { it.linkTo(projectId) }
    }

    /**
     * 재요청 확정 때 프로젝트 첨부를 요청 목록대로 맞춘다: 아직 연결되지 않은 본인 첨부는 연결하고, 목록에서 뺀 첨부는 지운다.
     * 남의 첨부나 다른 프로젝트의 첨부가 섞여 있으면 400
     */
    @Transactional
    fun sync(userId: Long, ids: List<Long>, projectId: Long) {
        val wanted = ids.toSet()
        val found = attachmentRepository.findByIdInAndUserId(wanted, userId)
        if (found.size != wanted.size || found.any { it.projectId != null && it.projectId != projectId }) {
            throw ApiException(HttpStatus.BAD_REQUEST, "INVALID_ATTACHMENT", "첨부를 찾을 수 없어요. 다시 올려 주세요.")
        }
        found.filter { it.projectId == null }.forEach { it.linkTo(projectId) }
        val dropped = attachmentRepository.findByProjectIdOrderById(projectId).filter { it.id !in wanted }
        dropped.mapNotNull { it.storageKey }.forEach(fileStorage::delete)
        attachmentRepository.deleteAll(dropped)
    }

    /** 프로젝트를 지울 때 그 첨부도 지운다 — 파일은 디스크에서, 행은 소프트 삭제 */
    @Transactional
    fun deleteOfProject(projectId: Long) {
        val attachments = attachmentRepository.findByProjectIdOrderById(projectId)
        attachments.mapNotNull { it.storageKey }.forEach(fileStorage::delete)
        attachmentRepository.deleteAll(attachments)
    }

    @Transactional(readOnly = true)
    fun ofProject(projectId: Long): List<AttachmentResponse> = attachmentRepository.findByProjectIdOrderById(projectId).map(AttachmentResponse::of)
}
