package com.weave.attachment.service

import java.io.ByteArrayOutputStream

/**
 * 사진의 메타데이터(EXIF 위치·촬영 기기, 텍스트)를 저장 전에 지운다(§3-9). 픽셀은 다시 인코딩하지 않는다(화질 그대로).
 * 라이브러리 없이 파일 구조만 다룬다 — commons-imaging은 정식 버전이 없어서 쓰지 않았다.
 */
object ImageMetadataStripper {
    /**
     * JPEG: SOS(영상 데이터) 전까지 세그먼트를 훑어 APP0(JFIF)·APP2(색 프로필)·APP14(Adobe 색 변환)만 남기고
     * 나머지 APPn(APP1 EXIF/XMP, APP13 IPTC 등)과 COM(주석)을 버린다.
     */
    fun stripJpeg(bytes: ByteArray): ByteArray {
        require(bytes.size > 4 && bytes[0] == 0xFF.toByte() && bytes[1] == 0xD8.toByte()) { "JPEG가 아니다" }
        val out = ByteArrayOutputStream(bytes.size)
        out.write(bytes, 0, 2)
        var i = 2
        while (i + 4 <= bytes.size) {
            if (bytes[i] != 0xFF.toByte()) throw IllegalArgumentException("JPEG 구조가 올바르지 않다")
            val marker = bytes[i + 1].toInt() and 0xFF
            if (marker == 0xDA) { // SOS — 이후는 영상 데이터라 그대로 복사
                out.write(bytes, i, bytes.size - i)
                return out.toByteArray()
            }
            val length = ((bytes[i + 2].toInt() and 0xFF) shl 8) or (bytes[i + 3].toInt() and 0xFF)
            val end = i + 2 + length
            require(length >= 2 && end <= bytes.size) { "JPEG 세그먼트 길이가 올바르지 않다" }
            val isApp = marker in 0xE0..0xEF
            val keep = !isApp && marker != 0xFE || marker == 0xE0 || marker == 0xE2 || marker == 0xEE
            if (keep) out.write(bytes, i, end - i)
            i = end
        }
        throw IllegalArgumentException("JPEG 영상 데이터가 없다")
    }

    private val PNG_SIGNATURE = byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)

    /** 메타데이터 청크: EXIF·텍스트·시각 */
    private val PNG_METADATA_CHUNKS = setOf("eXIf", "tEXt", "zTXt", "iTXt", "tIME")

    /** PNG: 청크를 훑어 메타데이터 청크만 버린다 */
    fun stripPng(bytes: ByteArray): ByteArray {
        require(bytes.size > 8 && bytes.copyOfRange(0, 8).contentEquals(PNG_SIGNATURE)) { "PNG가 아니다" }
        val out = ByteArrayOutputStream(bytes.size)
        out.write(bytes, 0, 8)
        var i = 8
        while (i + 12 <= bytes.size) {
            val length = ((bytes[i].toInt() and 0xFF) shl 24) or ((bytes[i + 1].toInt() and 0xFF) shl 16) or
                ((bytes[i + 2].toInt() and 0xFF) shl 8) or (bytes[i + 3].toInt() and 0xFF)
            val end = i + 12 + length
            require(length >= 0 && end <= bytes.size) { "PNG 청크 길이가 올바르지 않다" }
            val type = String(bytes, i + 4, 4, Charsets.US_ASCII)
            if (type !in PNG_METADATA_CHUNKS) out.write(bytes, i, end - i)
            i = end
            if (type == "IEND") break
        }
        return out.toByteArray()
    }

    /** WebP 메타데이터 청크: EXIF(위치 등)·XMP */
    private val WEBP_METADATA_CHUNKS = setOf("EXIF", "XMP ")

    /**
     * WebP(RIFF): 청크를 훑어 EXIF·XMP 청크를 버리고, VP8X 플래그의 EXIF(0x08)·XMP(0x04) 표시를 끈 뒤 RIFF 크기를 다시 적는다.
     * 청크 길이가 홀수면 1바이트 채움이 붙는다.
     */
    fun stripWebp(bytes: ByteArray): ByteArray {
        require(bytes.size >= 12 && String(bytes, 0, 4, Charsets.US_ASCII) == "RIFF" && String(bytes, 8, 4, Charsets.US_ASCII) == "WEBP") { "WebP가 아니다" }
        val body = ByteArrayOutputStream(bytes.size)
        body.write(bytes, 8, 4)
        var i = 12
        while (i + 8 <= bytes.size) {
            val type = String(bytes, i, 4, Charsets.US_ASCII)
            val length = (bytes[i + 4].toInt() and 0xFF) or ((bytes[i + 5].toInt() and 0xFF) shl 8) or
                ((bytes[i + 6].toInt() and 0xFF) shl 16) or ((bytes[i + 7].toInt() and 0xFF) shl 24)
            val end = i + 8 + length + (length and 1)
            require(length >= 0 && i + 8 + length <= bytes.size) { "WebP 청크 길이가 올바르지 않다" }
            if (type !in WEBP_METADATA_CHUNKS) {
                val chunk = bytes.copyOfRange(i, minOf(end, bytes.size))
                if (type == "VP8X" && length > 0) chunk[8] = (chunk[8].toInt() and 0x0C.inv()).toByte()
                body.write(chunk)
            }
            i = end
        }
        val size = body.size()
        return "RIFF".toByteArray() + byteArrayOf(size.toByte(), (size shr 8).toByte(), (size shr 16).toByte(), (size shr 24).toByte()) + body.toByteArray()
    }
}
