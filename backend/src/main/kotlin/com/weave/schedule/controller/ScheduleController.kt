package com.weave.schedule.controller

import com.weave.global.security.userId
import com.weave.schedule.dto.ScheduleResponse
import com.weave.schedule.service.ScheduleService
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/schedule")
@PreAuthorize("isAuthenticated()")
class ScheduleController(private val scheduleService: ScheduleService) {
    @GetMapping
    fun snapshot(@AuthenticationPrincipal jwt: Jwt): ScheduleResponse = scheduleService.snapshot(jwt.userId())

    /** 작업이 몰렸을 때 사용자가 직접 다시 배치 (설정 화면 버튼) */
    @PostMapping("/replan")
    fun replan(@AuthenticationPrincipal jwt: Jwt): ScheduleResponse = scheduleService.replan(jwt.userId())
}
