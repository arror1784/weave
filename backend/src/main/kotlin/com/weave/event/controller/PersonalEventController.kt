package com.weave.event.controller

import com.weave.event.dto.CreatePersonalEventRequest
import com.weave.event.dto.PersonalEventResponse
import com.weave.event.service.PersonalEventService
import com.weave.global.security.userId
import com.weave.global.web.PageResponse
import jakarta.validation.Valid
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import org.springframework.http.HttpStatus
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

/** 내 개인 일정 — 목록·추가·수정·삭제 */
@RestController
@RequestMapping("/api/v1/me/events")
@PreAuthorize("isAuthenticated()")
@Validated
class PersonalEventController(private val service: PersonalEventService) {

    @GetMapping
    fun list(
        @AuthenticationPrincipal jwt: Jwt,
        @RequestParam(defaultValue = "0") @Min(0) page: Int,
        @RequestParam(defaultValue = "100") @Min(1) @Max(200) size: Int,
    ): PageResponse<PersonalEventResponse> = service.list(jwt.userId(), page, size)

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@AuthenticationPrincipal jwt: Jwt, @Valid @RequestBody request: CreatePersonalEventRequest): PersonalEventResponse =
        service.create(jwt.userId(), request)

    /** 수정 — 추가와 같은 본문으로 모든 칸을 바꾼다(종류까지, 사용자 결정 2026-10-23) */
    @PatchMapping("/{id}")
    fun update(@AuthenticationPrincipal jwt: Jwt, @PathVariable id: Long, @Valid @RequestBody request: CreatePersonalEventRequest): PersonalEventResponse =
        service.update(jwt.userId(), id, request)

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@AuthenticationPrincipal jwt: Jwt, @PathVariable id: Long) = service.delete(jwt.userId(), id)
}
