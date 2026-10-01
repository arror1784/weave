package com.weave.schedule.controller

import com.weave.global.security.userId
import com.weave.schedule.dto.ScheduleResponse
import com.weave.schedule.service.ScheduleService
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/schedule")
@PreAuthorize("isAuthenticated()")
class ScheduleController(private val scheduleService: ScheduleService) {
    @GetMapping
    fun snapshot(@AuthenticationPrincipal jwt: Jwt): ScheduleResponse = scheduleService.snapshot(jwt.userId())
}
