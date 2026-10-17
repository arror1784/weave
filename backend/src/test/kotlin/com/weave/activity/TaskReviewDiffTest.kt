package com.weave.activity

import com.weave.activity.service.TaskReviewDiff
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import tools.jackson.databind.json.JsonMapper

class TaskReviewDiffTest : FunSpec({
    val mapper = JsonMapper.builder().build()
    fun tasks(json: String) = TaskReviewDiff.entries(mapper.readTree(json))

    test("같은 이름끼리 비교한다: 그대로 · 시간 바꿈 · 선행 바꿈 · 한쪽에만 있음 · 순서 바꿈") {
        val ai = tasks("""[{"title":"조사","estimatedHours":2.0,"dependsOnTitle":null},{"title":"설계","estimatedHours":3.0,"dependsOnTitle":"조사"},{"title":"발표","estimatedHours":1.0,"dependsOnTitle":null}]""")
        val final = tasks("""[{"title":"설계","estimatedHours":2.5,"dependsOnTitle":null},{"title":"조사","estimatedHours":2.0,"dependsOnTitle":null},{"title":"보고서","estimatedHours":1.0,"dependsOnTitle":null}]""")
        val diff = TaskReviewDiff.of(ai, final)
        diff.kept shouldBe listOf("조사")
        diff.hoursChanged shouldBe listOf("설계 3.0→2.5")
        diff.dependencyChanged shouldBe listOf("설계: 조사→없음")
        diff.onlyAi shouldBe listOf("발표")
        diff.onlyFinal shouldBe listOf("보고서")
        diff.orderChanged shouldBe true
    }

    test("이번 변경 전의 AI 제안 기록(선행 작업이 key k1…)도 제목으로 바꿔 비교한다") {
        val ai = tasks("""[{"title":"조사","estimatedHours":2.0,"dependsOnKey":null},{"title":"설계","estimatedHours":3.0,"dependsOnKey":"k1"}]""")
        val final = tasks("""[{"title":"조사","estimatedHours":2.0,"dependsOnTitle":null},{"title":"설계","estimatedHours":3.0,"dependsOnTitle":"조사"}]""")
        val diff = TaskReviewDiff.of(ai, final)
        diff.kept shouldBe listOf("조사", "설계")
        diff.dependencyChanged shouldBe emptyList()
        diff.orderChanged shouldBe false
    }

    test("목록 글: 번호·이름·시간·선행 작업") {
        TaskReviewDiff.describe(tasks("""[{"title":"조사","estimatedHours":2.0,"dependsOnTitle":null},{"title":"설계","estimatedHours":3.0,"dependsOnTitle":"조사"}]""")) shouldBe
            "1. 조사 (2.0h)\n2. 설계 (3.0h) ← 조사"
    }
})
