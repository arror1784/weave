package com.weave.ai.service

import org.springframework.core.io.ClassPathResource
import org.springframework.stereotype.Component

/**
 * 프로젝트 작업 분할 시스템 프롬프트 — 원본은 사용자가 쓴 `docs/Weave — AI 작업 분할 시스템 프롬프트.md`.
 * 빌드할 때 resources/prompts/project-breakdown.md로 복사된다(build.gradle.kts). 문서를 고치면 다음 빌드부터 반영된다.
 */
@Component
class ProjectBreakdownPrompt {
    private val text: String = ClassPathResource("prompts/project-breakdown.md").inputStream.use { String(it.readAllBytes()) }

    fun system(): String = text
}
