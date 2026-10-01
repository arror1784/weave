package com.weave.ai.dto

/** AI가 제안한 작업 — 앱의 작업 검토 화면이 그대로 받아 고친 뒤 POST /projects로 보낸다 */
data class ProposedTask(
    val key: String,
    val title: String,
    val estimatedHours: Double,
    val dependsOnKey: String?,
    val prerequisite: Boolean,
)
