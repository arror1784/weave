package com.weave.activity.service

/**
 * 사용 기록에 남기는 작업 목록 한 줄 — AI 제안(AI_CHAT)과 확정(PROJECT_CREATED·PROJECT_REPLANNED)이 같은 모양이라
 * 엑셀 "작업 검토 비교"에서 나란히 비교한다(TaskReviewDiff). 선행 작업은 key·id 대신 제목으로.
 */
object TaskLog {
    fun entry(title: String, estimatedHours: Double?, dependsOnTitle: String?, prerequisite: Boolean): Map<String, Any?> =
        mapOf("title" to title, "estimatedHours" to estimatedHours, "dependsOnTitle" to dependsOnTitle, "prerequisite" to prerequisite)
}
