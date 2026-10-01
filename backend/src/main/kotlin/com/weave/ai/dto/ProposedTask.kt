package com.weave.ai.dto

/** AI가 제안한 작업 — 앱의 작업 검토 화면이 그대로 받아 고친 뒤 POST /projects로 보낸다 */
data class ProposedTask(
    val key: String,
    val title: String,
    /** 목표·범위·완료 기준 */
    val description: String,
    val estimatedHours: Double,
    val dependsOnKey: String?,
    val prerequisite: Boolean,
    /** AI가 역산한 마감일 — 참고용. 저장·표시하는 마감일은 서버 일정 알고리즘이 정한다(사용자 결정) */
    val aiDueDate: java.time.LocalDate?,
)
