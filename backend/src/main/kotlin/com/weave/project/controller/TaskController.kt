package com.weave.project.controller

import com.weave.global.security.userId
import com.weave.project.dto.UpdateTaskRequest
import com.weave.project.dto.UpdateTaskResponse
import com.weave.project.service.TaskService
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/tasks")
@PreAuthorize("isAuthenticated()")
class TaskController(private val taskService: TaskService) {
    @PatchMapping("/{id}")
    fun update(@AuthenticationPrincipal jwt: Jwt, @PathVariable id: Long, @RequestBody request: UpdateTaskRequest): UpdateTaskResponse =
        taskService.update(jwt.userId(), id, request)
}
