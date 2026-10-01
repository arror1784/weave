package com.weave.schedule.dto

import com.weave.project.dto.TaskResponse
import java.time.LocalDate

/** 오늘·전체 일정·과부하·위젯 화면이 함께 쓰는 스냅샷 — 진행중 프로젝트와 그 작업만(크기가 제한된다) */
data class ScheduleResponse(
    /** 서버 기준 오늘(한국 시간) */
    val today: LocalDate,
    val dailyAvailableHours: Double,
    val projects: List<ProjectBriefResponse>,
    val tasks: List<TaskResponse>,
)
