package com.weave.attachment.controller

import com.weave.attachment.dto.AttachmentResponse
import com.weave.attachment.dto.CreateLinkRequest
import com.weave.attachment.service.AttachmentService
import com.weave.global.security.userId
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile

/** 참고자료 첨부 — 프로젝트 등록 전에 올리고, 등록할 때 attachmentIds로 연결한다 */
@RestController
@RequestMapping("/api/v1/attachments")
@PreAuthorize("isAuthenticated()")
class AttachmentController(private val attachmentService: AttachmentService) {

    @PostMapping(consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    @ResponseStatus(HttpStatus.CREATED)
    fun upload(@AuthenticationPrincipal jwt: Jwt, @RequestPart("file") file: MultipartFile): AttachmentResponse =
        attachmentService.upload(jwt.userId(), file)

    @PostMapping("/links")
    @ResponseStatus(HttpStatus.CREATED)
    fun addLink(@AuthenticationPrincipal jwt: Jwt, @Valid @RequestBody request: CreateLinkRequest): AttachmentResponse =
        attachmentService.addLink(jwt.userId(), request.url.trim())

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@AuthenticationPrincipal jwt: Jwt, @PathVariable id: Long) = attachmentService.delete(jwt.userId(), id)
}
