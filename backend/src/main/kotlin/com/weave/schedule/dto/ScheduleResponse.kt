package com.weave.schedule.dto

import com.weave.project.dto.TaskResponse
import java.time.LocalDate

/** 오늘·전체 일정·과부하·위젯 화면이 함께 쓰는 스냅샷 — 진행중 프로젝트와 그 작업만(크기가 제한된다) */
data class ScheduleResponse(
    /** 서버 기준 오늘(한국 시간) */
    val today: LocalDate,
    /** 오늘 가용 시간(공휴일이면 공휴일 값) — 날짜별 부하는 아래 요일별·공휴일 값으로 계산한다 */
    val dailyAvailableHours: Double,
    /** 요일별 가용 시간 — 월요일부터 7개(사용자 결정 2026-10-17) */
    val weeklyAvailableHours: List<Double>,
    val holidayAvailableHours: Double,
    /** 오늘 앞뒤 공휴일 날짜(약 2달 전 ~ 1년 뒤) — 공휴일은 요일보다 우선 */
    val holidays: List<LocalDate>,
    val projects: List<ProjectBriefResponse>,
    val tasks: List<TaskResponse>,
)
