package com.weave.client

/** AI에게 함께 보낼 첨부 내용 */
sealed interface AiAttachment {
    val title: String

    /** PDF 원본(base64) — Claude가 직접 읽는다 */
    data class Pdf(override val title: String, val base64: String) : AiAttachment

    /** 사진(base64) — image/jpeg · image/png */
    data class Image(override val title: String, val base64: String, val mediaType: String) : AiAttachment

    /** 글자 — txt, Office·한글에서 뽑은 글자, 링크 주소 */
    data class Text(override val title: String, val text: String) : AiAttachment
}
