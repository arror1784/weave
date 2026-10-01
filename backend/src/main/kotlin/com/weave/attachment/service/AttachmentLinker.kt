package com.weave.attachment.service

import com.weave.attachment.dto.AttachmentResponse
import com.weave.attachment.repository.AttachmentRepository
import com.weave.global.error.ApiException
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/** 프로젝트 등록 때 미리 올린 첨부를 프로젝트에 연결한다 */
@Service
class AttachmentLinker(private val attachmentRepository: AttachmentRepository) {

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

    @Transactional(readOnly = true)
    fun ofProject(projectId: Long): List<AttachmentResponse> = attachmentRepository.findByProjectIdOrderById(projectId).map(AttachmentResponse::of)
}
