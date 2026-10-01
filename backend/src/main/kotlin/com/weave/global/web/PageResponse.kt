package com.weave.global.web

import org.springframework.data.domain.Page

/** 목록 응답 공통 모양 (§4-10 페이지네이션) */
data class PageResponse<T : Any>(
    val items: List<T>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
) {
    companion object {
        fun <E : Any, T : Any> of(page: Page<E>, items: List<T>) = PageResponse(items, page.number, page.size, page.totalElements, page.totalPages)
    }
}
