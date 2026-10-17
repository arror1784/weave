package com.weave.user.service

import com.weave.activity.domain.ActivityType
import com.weave.activity.service.ActivityRecorder
import com.weave.global.error.ApiException
import com.weave.global.time.TodayProvider
import com.weave.schedule.service.OverdueRoller
import com.weave.schedule.service.Replanner
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
    private val todayProvider: TodayProvider,
    private val overdueRoller: OverdueRoller,
    private val replanner: Replanner,
) {

    @Transactional(readOnly = true)
    fun me(userId: Long): UserResponse = UserResponse.of(find(userId), todayProvider.today())

    /**
     * 바꿀 값만 바꾼다(사용자 결정 2026-10-17):
     * - 요일별 7개 + 공휴일 가용 시간, 0시간 = 쉬는 날. dailyAvailableHours(요일별 전 앱)는 7요일·공휴일을 모두 그 값으로.
     * - 상시 칸 시간은 가장 긴 요일(공휴일 포함) 이하 — 가장 긴 요일을 줄이면 칸 시간도 함께 줄인다.
     * - 가용 시간이나 상시 칸이 바뀌면 바로 다시 배치한다 — 밀린 작업까지("작업 다시 배치" 버튼과 같게, 지연 표시는 남는다).
     */
    @Transactional
    fun updateSettings(userId: Long, request: UpdateSettingsRequest): UserResponse {
        val (daily, weekly, holiday, perWeek, hours) = request
        if (daily == null && weekly == null && holiday == null && perWeek == null && hours == null) badRequest("바꿀 설정을 보내 주세요.")
        if ((listOfNotNull(daily, holiday, hours) + weekly.orEmpty()).any { (it * 2) % 1.0 != 0.0 }) badRequest("0.5시간 단위로 정해 주세요.")
        if (weekly.orEmpty().any { it < 0.0 || it > MAX_DAILY_HOURS }) badRequest("요일별 가용 시간은 0~24시간으로 정해 주세요.")
        val user = find(userId)

        val oldWeekly = user.weeklyAvailableHours
        val oldHoliday = user.holidayAvailableHours
        val newWeekly = weekly ?: daily?.let { d -> List(7) { d } } ?: oldWeekly
        val newHoliday = holiday ?: daily ?: oldHoliday
        val longest = (newWeekly + newHoliday).max()
        if (hours != null && hours > longest) badRequest("상시 칸 시간은 가장 긴 요일의 가용 시간(${longest}시간) 이하로 정해 주세요.")

        val newPerWeek = perWeek ?: user.standingSessionsPerWeek
        val newHours = minOf(hours ?: user.standingSessionHours, longest).coerceAtLeast(MIN_SESSION_HOURS)
        val availabilityChanged = newWeekly != oldWeekly || newHoliday != oldHoliday
        val standingChanged = newPerWeek != user.standingSessionsPerWeek || newHours != user.standingSessionHours

        if (availabilityChanged) {
            activityRecorder.record(
                userId, ActivityType.SETTINGS_CHANGED,
                detail = mapOf("weeklyFrom" to oldWeekly, "weeklyTo" to newWeekly, "holidayFrom" to oldHoliday, "holidayTo" to newHoliday),
            )
        }
        if (standingChanged) {
            activityRecorder.record(
                userId,
                ActivityType.STANDING_SLOTS_CHANGED,
                detail = mapOf("fromPerWeek" to user.standingSessionsPerWeek, "toPerWeek" to newPerWeek, "fromHours" to user.standingSessionHours, "toHours" to newHours),
            )
        }
        user.weeklyAvailableHours = newWeekly
        user.holidayAvailableHours = newHoliday
        user.standingSessionsPerWeek = newPerWeek
        user.standingSessionHours = newHours

        if (availabilityChanged || standingChanged) {
            overdueRoller.roll(userId)
            val placements = replanner.replan(user, todayProvider.today(), includeDelayed = true)
            activityRecorder.record(
                userId, ActivityType.SCHEDULE_REPLANNED,
                detail = mapOf("taskCount" to placements.size, "lateCount" to placements.values.count { it.late }, "by" to "settings"),
            )
        }
        return UserResponse.of(user, todayProvider.today())
    }

    private fun badRequest(message: String): Nothing = throw ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", message)

    /** 토큰의 사용자가 없으면(탈퇴 등) 401 — 앱이 다시 로그인하게 한다 */
    fun find(userId: Long): User =
        userRepository.findById(userId).orElseThrow { ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "다시 로그인해 주세요.") }

    companion object {
        private const val MIN_SESSION_HOURS = 0.5
        private const val MAX_DAILY_HOURS = 24.0
    }
}
