package com.weave.ai.service

import org.springframework.core.io.ClassPathResource
import org.springframework.stereotype.Component

/**
 * 프로젝트 작업 세분화 프롬프트 — resources/prompts/project-breakdown.md에서 읽는다.
 * ⚠ 지금 내용은 임시다(사용자가 작성 중). 파일만 바꾸면 되도록 코드와 분리했다.
 */
@Component
class ProjectBreakdownPrompt {
    private val text: String = ClassPathResource("prompts/project-breakdown.md").inputStream.use { String(it.readAllBytes()) }

    fun system(): String = text
}
