package com.weave.project.controller

import com.weave.global.security.userId
import com.weave.global.web.PageResponse
import com.weave.project.dto.CreateProjectRequest
import com.weave.project.dto.CreateProjectResponse
import com.weave.project.dto.ProjectDetailResponse
import com.weave.project.dto.ProjectSummaryResponse
import com.weave.project.dto.UpdateProjectRequest
import com.weave.project.service.ProjectService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
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

@RestController
@RequestMapping("/api/v1/projects")
@PreAuthorize("isAuthenticated()")
class ProjectController(private val projectService: ProjectService) {

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@AuthenticationPrincipal jwt: Jwt, @Valid @RequestBody request: CreateProjectRequest): CreateProjectResponse =
        projectService.create(jwt.userId(), request)

    @GetMapping
    fun list(
        @AuthenticationPrincipal jwt: Jwt,
        @RequestParam(defaultValue = "active") status: String,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): PageResponse<ProjectSummaryResponse> = projectService.list(jwt.userId(), status, page, size)

    @GetMapping("/{id}")
    fun detail(@AuthenticationPrincipal jwt: Jwt, @PathVariable id: Long): ProjectDetailResponse = projectService.detail(jwt.userId(), id)

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@AuthenticationPrincipal jwt: Jwt, @PathVariable id: Long) = projectService.delete(jwt.userId(), id)

    @PatchMapping("/{id}")
    fun update(@AuthenticationPrincipal jwt: Jwt, @PathVariable id: Long, @Valid @RequestBody request: UpdateProjectRequest): ProjectDetailResponse =
        projectService.update(jwt.userId(), id, request)
}
