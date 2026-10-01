package com.weave.user.service

import com.weave.global.error.ApiException
import com.weave.user.domain.User
import com.weave.user.dto.UpdateSettingsRequest
import com.weave.user.dto.UserResponse
import com.weave.user.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class UserService(private val userRepository: UserRepository) {

    @Transactional(readOnly = true)
    fun me(userId: Long): UserResponse = UserResponse.of(find(userId))

    @Transactional
    fun updateSettings(userId: Long, request: UpdateSettingsRequest): UserResponse {
        if ((request.dailyAvailableHours * 2) % 1.0 != 0.0) {
            throw ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "0.5시간 단위로 정해 주세요.")
        }
        val user = find(userId)
        user.dailyAvailableHours = request.dailyAvailableHours
        return UserResponse.of(user)
    }

    /** 토큰의 사용자가 없으면(탈퇴 등) 401 — 앱이 다시 로그인하게 한다 */
    fun find(userId: Long): User =
        userRepository.findById(userId).orElseThrow { ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "다시 로그인해 주세요.") }
}
