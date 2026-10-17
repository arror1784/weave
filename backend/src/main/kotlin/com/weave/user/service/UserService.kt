package com.weave.user.service

import com.weave.activity.domain.ActivityType
import com.weave.activity.service.ActivityRecorder
import com.weave.global.error.ApiException
import com.weave.user.domain.User
import com.weave.user.dto.UpdateSettingsRequest
import com.weave.user.dto.UserResponse
import com.weave.user.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class UserService(
    private val userRepository: UserRepository,
    private val activityRecorder: ActivityRecorder,
) {

    @Transactional(readOnly = true)
    fun me(userId: Long): UserResponse = UserResponse.of(find(userId))

    /**
     * 바꿀 값만 바꾼다. 상시 칸 시간은 하루 가용 시간을 넘을 수 없다(사용자 결정 2026-10-17) —
     * 하루 가용을 칸 시간보다 줄이면 칸 시간도 하루 가용으로 줄인다(Claude 해석).
     * 설정을 바꿔도 다시 배치하지 않는다 — 다음 등록·"다시 배치" 때 반영된다.
     */
    @Transactional
    fun updateSettings(userId: Long, request: UpdateSettingsRequest): UserResponse {
        val (daily, perWeek, hours) = request
        if (daily == null && perWeek == null && hours == null) badRequest("바꿀 설정을 보내 주세요.")
        if (listOfNotNull(daily, hours).any { (it * 2) % 1.0 != 0.0 }) badRequest("0.5시간 단위로 정해 주세요.")
        val user = find(userId)
        val newDaily = daily ?: user.dailyAvailableHours
        if (hours != null && hours > newDaily) badRequest("상시 칸 시간은 하루 가용 시간(${newDaily}시간) 이하로 정해 주세요.")

        if (daily != null && daily != user.dailyAvailableHours) {
            activityRecorder.record(userId, ActivityType.SETTINGS_CHANGED, detail = mapOf("from" to user.dailyAvailableHours, "to" to daily))
        }
        val newPerWeek = perWeek ?: user.standingSessionsPerWeek
        val newHours = minOf(hours ?: user.standingSessionHours, newDaily)
        if (newPerWeek != user.standingSessionsPerWeek || newHours != user.standingSessionHours) {
            activityRecorder.record(
                userId,
                ActivityType.STANDING_SLOTS_CHANGED,
                detail = mapOf("fromPerWeek" to user.standingSessionsPerWeek, "toPerWeek" to newPerWeek, "fromHours" to user.standingSessionHours, "toHours" to newHours),
            )
        }
        user.dailyAvailableHours = newDaily
        user.standingSessionsPerWeek = newPerWeek
        user.standingSessionHours = newHours
        return UserResponse.of(user)
    }

    private fun badRequest(message: String): Nothing = throw ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", message)

    /** 토큰의 사용자가 없으면(탈퇴 등) 401 — 앱이 다시 로그인하게 한다 */
    fun find(userId: Long): User =
        userRepository.findById(userId).orElseThrow { ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "다시 로그인해 주세요.") }
}
