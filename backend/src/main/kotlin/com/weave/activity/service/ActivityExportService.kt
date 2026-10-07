package com.weave.activity.service

import com.weave.activity.domain.ActivityLog
import com.weave.activity.domain.ActivityType
import com.weave.activity.repository.ActivityLogRepository
import com.weave.project.domain.Project
import com.weave.project.repository.ProjectRepository
import org.apache.poi.ss.usermodel.Sheet
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper
import java.io.ByteArrayOutputStream
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * 내 사용 기록을 엑셀(.xlsx)로 — 시트: 활동 기록 · 날짜별 요약 · 프로젝트별 · AI 대화 (사용자 결정 2026-10-07, Mac 명령으로 받는다).
 * 날짜는 한국 시간, 하루는 아침 6시에 바뀐다(앱·서버 일정과 같은 기준).
 */
@Service
class ActivityExportService(
    private val repository: ActivityLogRepository,
    private val projectRepository: ProjectRepository,
    private val objectMapper: ObjectMapper,
) {
    @Transactional(readOnly = true)
    fun export(userId: Long): ByteArray {
        val logs = repository.findByUserIdOrderByOccurredAtAscIdAsc(userId).map { it to objectMapper.readTree(it.detail) }
        val current = projectRepository.findByUserIdAndStatus(userId, Project.ACTIVE).associateBy { it.id!! } +
            projectRepository.findByUserIdAndStatus(userId, Project.DONE).associateBy { it.id!! }
        val names = mutableMapOf<Long, String>()
        logs.forEach { (l, d) -> l.projectId?.let { id -> text(d, "name")?.let { names[id] = it } } }
        current.forEach { (id, p) -> names[id] = p.name }

        XSSFWorkbook().use { wb ->
            wb.createSheet("활동 기록").apply {
                header("시각", "종류", "종류 코드", "출처", "프로젝트", "작업", "내용", "세부(JSON)")
                logs.forEach { (l, d) ->
                    row(TIME.format(l.occurredAt.atZone(SEOUL)), ActivityType.labelOf(l.type), l.type, SOURCE[l.source] ?: l.source,
                        l.projectId?.let { names[it] ?: text(d, "projectName") ?: "#$it" } ?: text(d, "projectName") ?: "",
                        text(d, "title") ?: "", summary(l.type, d), l.detail)
                }
            }
            wb.createSheet("날짜별 요약").apply {
                val cols = listOf(ActivityType.TASK_DONE, ActivityType.TASK_UNDONE, ActivityType.PROJECT_CREATED, ActivityType.AI_CHAT, ActivityType.APP_OPENED, ActivityType.SCREEN_VIEWED, ActivityType.WIDGET_RENDERED)
                header("날짜(아침 6시 기준)", "전체 기록", *cols.map { it.label }.toTypedArray(), "완료한 작업 시간(h)")
                logs.groupBy { day(it.first) }.toSortedMap().forEach { (date, items) ->
                    row(date, items.size, *cols.map { c -> items.count { it.first.type == c.name } }.toTypedArray(),
                        items.filter { it.first.type == ActivityType.TASK_DONE.name }.sumOf { it.second.path("estimatedHours").asDouble(0.0) })
                }
            }
            wb.createSheet("프로젝트별").apply {
                header("프로젝트 id", "이름", "현재 상태", "처음 기록", "마지막 기록", "기록 수", "작업 완료", "AI 챗봇", "재요청")
                logs.filter { it.first.projectId != null }.groupBy { it.first.projectId!! }.forEach { (id, items) ->
                    val status = current[id]?.let { if (it.status == Project.DONE) "완료" else "진행중" } ?: "삭제됨"
                    row(id, names[id] ?: "", status, TIME.format(items.first().first.occurredAt.atZone(SEOUL)), TIME.format(items.last().first.occurredAt.atZone(SEOUL)),
                        items.size, items.count { it.first.type == ActivityType.TASK_DONE.name }, items.count { it.first.type == ActivityType.AI_CHAT.name },
                        items.count { it.first.type == ActivityType.PROJECT_REPLANNED.name })
                }
            }
            wb.createSheet("AI 대화").apply {
                header("시각", "프로젝트", "차례", "보낸 답", "응답 종류", "AI 응답", "제안 작업 수", "걸린 시간(초)", "입력 토큰", "출력 토큰", "결과")
                logs.filter { it.first.type == ActivityType.AI_CHAT.name || it.first.type == ActivityType.AI_CHAT_FAILED.name }.forEach { (l, d) ->
                    row(TIME.format(l.occurredAt.atZone(SEOUL)), text(d, "projectName") ?: "", d.path("turn").asInt(0), text(d, "userMessage") ?: "(첫 질문 요청)",
                        when (text(d, "responseType")) { "tasks" -> "작업 제안"; "question" -> "질문"; else -> "" }, text(d, "aiMessage") ?: "",
                        d.path("proposedTasks").size(), d.path("durationMs").asLong(0) / 1000.0, d.path("inputTokens").asLong(0), d.path("outputTokens").asLong(0),
                        if (l.type == ActivityType.AI_CHAT_FAILED.name) "실패: ${text(d, "error")}" else "성공")
                }
            }
            return ByteArrayOutputStream().also(wb::write).toByteArray()
        }
    }

    /** 활동 기록 시트의 "내용" — 세부 JSON에서 사람이 읽을 한 줄 */
    private fun summary(type: String, d: JsonNode): String = when (type) {
        "PROJECT_CREATED" -> "${text(d, "name")} · 작업 ${d.path("taskCount").asInt()}개${d.path("totalHours").takeIf { !it.isMissingNode }?.let { " · ${it.asDouble()}h" } ?: ""}${text(d, "deadline")?.let { " · 마감 $it" } ?: " · 상시"}"
        "PROJECT_REPLANNED" -> "${text(d, "name")} · 완료 ${d.path("keptDone").asInt()}개 남김 · ${d.path("removed").asInt()}개 → ${d.path("added").asInt()}개"
        "PROJECT_COLOR_CHANGED" -> "${text(d, "from")} → ${text(d, "to")}"
        "PROJECT_COMPLETED", "PROJECT_DELETED" -> text(d, "name") ?: ""
        "TASK_DONE", "TASK_UNDONE" -> "${text(d, "title")}${d.path("estimatedHours").takeIf { it.isNumber }?.let { " (${it.asDouble()}h)" } ?: ""}"
        "OVERDUE_MOVED" -> "${d.path("count").asInt()}개: ${d.path("titles").joinToString(", ") { it.asString() }}"
        "SCHEDULE_REPLANNED" -> "작업 ${d.path("taskCount").asInt()}개 다시 배치"
        "SETTINGS_CHANGED" -> "하루 가용 ${d.path("from").asDouble()}h → ${d.path("to").asDouble()}h"
        "ATTACHMENT_UPLOADED" -> "${text(d, "name")} (${text(d, "contentType") ?: ""}, ${d.path("size").asLong()}B)"
        "ATTACHMENT_LINK_ADDED" -> text(d, "url") ?: text(d, "name") ?: ""
        "ATTACHMENT_DELETED" -> text(d, "name") ?: ""
        "AI_CHAT" -> "${d.path("turn").asInt()}번째 답 → ${if (text(d, "responseType") == "tasks") "작업 ${d.path("proposedTasks").size()}개 제안" else "질문"}"
        "AI_CHAT_FAILED" -> "실패 (${text(d, "error")})"
        "SCREEN_VIEWED" -> text(d, "path") ?: ""
        "WIDGET_RENDERED" -> d.path("taskCount").takeIf { !it.isMissingNode }?.let { "오늘 할 일 ${it.asInt()}개" } ?: ""
        else -> ""
    }

    private fun text(d: JsonNode, key: String): String? = d.get(key)?.takeIf { !it.isNull }?.asString()

    private fun day(l: ActivityLog) = l.occurredAt.atZone(SEOUL).minusHours(6).toLocalDate().toString()

    private fun Sheet.header(vararg titles: String) {
        val r = createRow(0)
        titles.forEachIndexed { i, t -> r.createCell(i).setCellValue(t) }
        createFreezePane(0, 1)
    }

    private fun Sheet.row(vararg values: Any?) {
        val r = createRow(lastRowNum + 1)
        values.forEachIndexed { i, v ->
            val c = r.createCell(i)
            when (v) {
                is Number -> c.setCellValue(v.toDouble())
                null -> c.setCellValue("")
                else -> c.setCellValue(v.toString().take(32_000))
            }
        }
    }

    companion object {
        val SEOUL: ZoneId = ZoneId.of("Asia/Seoul")
        val TIME: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
        val SOURCE = mapOf("server" to "서버", "app" to "앱", "backfill" to "기능 전 데이터")
    }
}
