package com.weave.ai.controller

import com.weave.ai.dto.ProjectChatRequest
import com.weave.ai.dto.ProjectChatResponse
import com.weave.ai.service.ProjectChatService
import com.weave.global.ratelimit.RateLimitPolicy
import com.weave.global.security.userId
import jakarta.validation.Valid
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/project-chat")
@PreAuthorize("isAuthenticated()")
class ProjectChatController(private val projectChatService: ProjectChatService, private val rateLimit: RateLimitPolicy) {
    /** 등록 2단계: 대화를 보내면 다음 질문 또는 작업 제안을 돌려준다. 사용자당 한 시간·하루 횟수 제한(AI 비용, 2026-10-19) */
    @PostMapping
    fun chat(@AuthenticationPrincipal jwt: Jwt, @Valid @RequestBody request: ProjectChatRequest): ProjectChatResponse {
        rateLimit.chat(jwt.userId())
        return projectChatService.chat(jwt.userId(), request)
    }
}
