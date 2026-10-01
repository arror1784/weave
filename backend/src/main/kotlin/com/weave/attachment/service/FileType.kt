package com.weave.attachment.service

/**
 * 받을 수 있는 파일 형식(사용자 결정): PDF · 이미지(jpg·png·heic) · Office(docx·pptx·xlsx) · 한글(hwp·hwpx) · txt.
 * 확장자와 파일 앞부분(시그니처)이 모두 맞아야 받는다(§3-9) — 앱이 보낸 MIME은 믿지 않는다.
 */
enum class FileType(val extensions: Set<String>, val contentType: String, val image: Boolean = false) {
    PDF(setOf("pdf"), "application/pdf"),
    JPEG(setOf("jpg", "jpeg"), "image/jpeg", image = true),
    PNG(setOf("png"), "image/png", image = true),
    HEIC(setOf("heic", "heif"), "image/heic", image = true),
    DOCX(setOf("docx"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    PPTX(setOf("pptx"), "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
    XLSX(setOf("xlsx"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    HWPX(setOf("hwpx"), "application/hwp+zip"),
    HWP(setOf("hwp"), "application/x-hwp"),
    TXT(setOf("txt"), "text/plain"),
    ;

    fun matches(bytes: ByteArray): Boolean = when (this) {
        PDF -> startsWith(bytes, "%PDF-".toByteArray())
        JPEG -> startsWith(bytes, byteArrayOf(0xFF.toByte(), 0xD8.toByte(), 0xFF.toByte()))
        PNG -> startsWith(bytes, byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A))
        HEIC -> bytes.size > 12 && String(bytes, 4, 4, Charsets.US_ASCII) == "ftyp" &&
            String(bytes, 8, 4, Charsets.US_ASCII) in setOf("heic", "heix", "hevc", "heim", "heis", "mif1", "msf1")
        // Office Open XML·HWPX는 ZIP 컨테이너
        DOCX, PPTX, XLSX, HWPX -> startsWith(bytes, byteArrayOf(0x50, 0x4B, 0x03, 0x04))
        // HWP 5.0은 OLE 복합 문서
        HWP -> startsWith(bytes, byteArrayOf(0xD0.toByte(), 0xCF.toByte(), 0x11, 0xE0.toByte(), 0xA1.toByte(), 0xB1.toByte(), 0x1A, 0xE1.toByte()))
        // 텍스트: 앞부분에 NUL 바이트가 없어야 한다
        TXT -> bytes.asSequence().take(8192).none { it == 0.toByte() }
    }

    companion object {
        fun ofExtension(ext: String): FileType? = entries.firstOrNull { ext.lowercase() in it.extensions }

        private fun startsWith(bytes: ByteArray, prefix: ByteArray) = bytes.size >= prefix.size && prefix.indices.all { bytes[it] == prefix[it] }
    }
}
