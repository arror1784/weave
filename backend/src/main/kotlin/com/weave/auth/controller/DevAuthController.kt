package com.weave.auth.controller

import com.weave.auth.dto.DevLoginRequest
import com.weave.auth.dto.TokenResponse
import com.weave.auth.service.DevAuthService
import jakarta.validation.Valid
import org.springframework.context.annotation.Profile
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/** 개발용 로그인 — 비밀번호 없이 토큰 발급. local 프로필에서만 존재한다(§3-4, 다른 프로필에선 404). */
@Profile("local")
@RestController
@RequestMapping("/api/v1/dev")
class DevAuthController(private val devAuthService: DevAuthService) {
    @PostMapping("/login")
    @PreAuthorize("permitAll()")
    fun login(@Valid @RequestBody request: DevLoginRequest): TokenResponse = devAuthService.login(request.email)
}
