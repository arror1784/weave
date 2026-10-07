package com.weave.activity.controller

import com.weave.activity.dto.AppEventsRequest
import com.weave.activity.service.ActivityExportService
import com.weave.activity.service.ActivityService
import com.weave.global.security.userId
import jakarta.validation.Valid
import org.springframework.http.ContentDisposition
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate
import java.time.ZoneId

/** 사용 기록 — 앱이 보내는 기록 받기 · 내 기록 엑셀 내보내기 */
@RestController
@RequestMapping("/api/v1")
@PreAuthorize("isAuthenticated()")
class ActivityController(
    private val activityService: ActivityService,
    private val activityExportService: ActivityExportService,
) {
    @PostMapping("/activity/events")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun events(@AuthenticationPrincipal jwt: Jwt, @Valid @RequestBody request: AppEventsRequest) = activityService.recordAppEvents(jwt.userId(), request)

    @GetMapping("/me/activity/export")
    fun export(@AuthenticationPrincipal jwt: Jwt): ResponseEntity<ByteArray> {
        val name = "weave-사용기록-${LocalDate.now(ZoneId.of("Asia/Seoul"))}.xlsx"
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(name, Charsets.UTF_8).build().toString())
            .body(activityExportService.export(jwt.userId()))
    }
}
