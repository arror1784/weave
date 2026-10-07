package com.weave.user.service

import com.weave.activity.repository.ActivityLogRepository
import com.weave.attachment.service.AttachmentStorageCleaner
import com.weave.attachment.repository.AttachmentRepository
import com.weave.auth.repository.RefreshTokenRepository
import com.weave.project.repository.ProjectRepository
import com.weave.project.repository.TaskRepository
import com.weave.user.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 탈퇴 — 개인정보를 소프트 삭제가 아니라 실제로 지운다(§3-17).
 * 사용자 데이터를 가진 기능이 생기면 여기에서 함께 지운다(자식 → 부모 순서, FK 때문에).
 */
@Service
class AccountDeletionService(
    private val userService: UserService,
    private val userRepository: UserRepository,
    private val refreshTokenRepository: RefreshTokenRepository,
    private val projectRepository: ProjectRepository,
    private val taskRepository: TaskRepository,
    private val attachmentRepository: AttachmentRepository,
    private val attachmentStorageCleaner: AttachmentStorageCleaner,
    private val activityLogRepository: ActivityLogRepository,
) {
    @Transactional
    fun delete(userId: Long) {
        userService.find(userId)
        attachmentStorageCleaner.deleteFilesOf(userId)
        activityLogRepository.hardDeleteByUserId(userId)
        attachmentRepository.hardDeleteByUserId(userId)
        taskRepository.unlinkDependenciesByUserId(userId)
        taskRepository.hardDeleteByUserId(userId)
        projectRepository.hardDeleteByUserId(userId)
        refreshTokenRepository.hardDeleteByUserId(userId)
        userRepository.hardDelete(userId)
    }
}
