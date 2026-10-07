package com.weave.activity.domain

/** 기록 종류와 엑셀에 쓰는 이름. app = 앱이 보낼 수 있는 종류(그 밖은 서버만 남긴다) */
enum class ActivityType(val label: String, val app: Boolean = false) {
    SIGNUP("회원가입"),
    LOGIN("로그인"),
    LOGOUT("로그아웃"),
    PROJECT_CREATED("프로젝트 등록"),
    PROJECT_REPLANNED("AI에게 재요청(작업 교체)"),
    PROJECT_COLOR_CHANGED("프로젝트 색 변경"),
    PROJECT_COMPLETED("프로젝트 완료"),
    PROJECT_DELETED("프로젝트 삭제"),
    TASK_DONE("작업 완료"),
    TASK_UNDONE("작업 완료 취소"),
    OVERDUE_MOVED("밀린 작업 오늘로 옮김"),
    SCHEDULE_REPLANNED("작업 다시 배치"),
    SETTINGS_CHANGED("하루 가용 시간 변경"),
    ATTACHMENT_UPLOADED("첨부 올리기"),
    ATTACHMENT_LINK_ADDED("링크 첨부"),
    ATTACHMENT_DELETED("첨부 삭제"),
    AI_CHAT("AI 챗봇 대화"),
    AI_CHAT_FAILED("AI 챗봇 실패"),
    APP_OPENED("앱 열기", app = true),
    SCREEN_VIEWED("화면 보기", app = true),
    WIDGET_RENDERED("위젯 갱신", app = true),
    ;

    companion object {
        fun labelOf(type: String) = entries.firstOrNull { it.name == type }?.label ?: type
    }
}
