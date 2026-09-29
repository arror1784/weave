package com.weave.global.config

import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

/** 테스트 전용 — @PreAuthorize가 실제로 적용되는지(@EnableMethodSecurity 누락 여부) 확인한다. */
@RestController
class MethodSecurityProbeController {
    @GetMapping("/api/v1/test/admin-only")
    @PreAuthorize("hasRole('ADMIN')")
    fun adminOnly(): String = "ok"
}
