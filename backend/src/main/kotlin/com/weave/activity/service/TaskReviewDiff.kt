package com.weave.activity.service

import tools.jackson.databind.JsonNode

/**
 * 검토 화면에서 사용자가 고친 것 — 같은 대화의 마지막 AI 제안과 확정한 작업 목록을 비교한다(보고서 향후 계획: 수정 기록을 프롬프트 개선 자료로, 2026-10-17).
 * 작업은 이름으로 짝짓는다 — 이름을 바꾼 작업은 "AI에만 있음" + "확정에만 있음"으로 나타난다.
 */
data class TaskReviewDiff(
    val kept: List<String>,
    val hoursChanged: List<String>,
    val dependencyChanged: List<String>,
    val onlyAi: List<String>,
    val onlyFinal: List<String>,
    val orderChanged: Boolean,
) {
    data class Entry(val title: String, val hours: Double, val dependsOnTitle: String?)

    companion object {
        /** 기록의 작업 목록(JSON 배열) → 비교용. 이번 변경 전 AI 제안 기록은 선행 작업이 key(k1…)라 순서로 제목을 찾는다 */
        fun entries(node: JsonNode?): List<Entry> {
            val items = node?.takeIf { it.isArray }?.toList().orEmpty()
            val titles = items.map { it.path("title").asString("") }
            return items.map { item ->
                val byTitle = item.get("dependsOnTitle")?.takeIf { !it.isNull }?.asString()
                val byKey = item.get("dependsOnKey")?.takeIf { !it.isNull }?.asString()?.removePrefix("k")?.toIntOrNull()?.let { titles.getOrNull(it - 1) }
                Entry(item.path("title").asString(""), item.path("estimatedHours").asDouble(0.0), byTitle ?: byKey)
            }
        }

        fun of(ai: List<Entry>, final: List<Entry>): TaskReviewDiff {
            val aiByTitle = ai.associateBy { it.title }
            val finalTitles = final.map { it.title }.toSet()
            val common = final.filter { it.title in aiByTitle }
            return TaskReviewDiff(
                kept = common.filter { aiByTitle.getValue(it.title).let { a -> a.hours == it.hours && a.dependsOnTitle == it.dependsOnTitle } }.map { it.title },
                hoursChanged = common.mapNotNull { f -> aiByTitle.getValue(f.title).takeIf { it.hours != f.hours }?.let { "${f.title} ${it.hours}→${f.hours}" } },
                dependencyChanged = common.mapNotNull { f ->
                    aiByTitle.getValue(f.title).takeIf { it.dependsOnTitle != f.dependsOnTitle }?.let { "${f.title}: ${it.dependsOnTitle ?: "없음"}→${f.dependsOnTitle ?: "없음"}" }
                },
                onlyAi = ai.filter { it.title !in finalTitles }.map { it.title },
                onlyFinal = final.filter { it.title !in aiByTitle }.map { it.title },
                orderChanged = ai.map { it.title }.filter { it in finalTitles } != common.map { it.title },
            )
        }

        fun describe(tasks: List<Entry>): String =
            tasks.mapIndexed { i, t -> "${i + 1}. ${t.title} (${t.hours}h)${t.dependsOnTitle?.let { " ← $it" } ?: ""}" }.joinToString("\n")
    }
}
