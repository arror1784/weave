package com.weave.user.controller

import com.weave.global.security.userId
import com.weave.user.dto.UpdateSettingsRequest
import com.weave.user.dto.UserResponse
import com.weave.user.service.AccountDeletionService
import com.weave.user.service.UserService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

/** 내 계정 — 정보 조회, 설정(하루 가용 시간), 탈퇴 */
@RestController
@RequestMapping("/api/v1/me")
@PreAuthorize("isAuthenticated()")
class MeController(
    private val userService: UserService,
    private val accountDeletionService: AccountDeletionService,
) {
    @GetMapping
    fun me(@AuthenticationPrincipal jwt: Jwt): UserResponse = userService.me(jwt.userId())

    @PatchMapping("/settings")
    fun updateSettings(@AuthenticationPrincipal jwt: Jwt, @Valid @RequestBody request: UpdateSettingsRequest): UserResponse =
        userService.updateSettings(jwt.userId(), request)

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@AuthenticationPrincipal jwt: Jwt) = accountDeletionService.delete(jwt.userId())
}
