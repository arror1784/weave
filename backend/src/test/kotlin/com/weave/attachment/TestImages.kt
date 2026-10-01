package com.weave.attachment

import java.awt.image.BufferedImage
import java.io.ByteArrayOutputStream
import java.util.zip.CRC32
import javax.imageio.ImageIO

/** 테스트용 이미지: 메타데이터(EXIF·텍스트)를 일부러 넣은 JPEG·PNG */
object TestImages {
    private fun encode(format: String): ByteArray {
        val image = BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB)
        return ByteArrayOutputStream().also { ImageIO.write(image, format, it) }.toByteArray()
    }

    /** SOI 바로 뒤에 "Exif" APP1 세그먼트(가짜 GPS 문자열 포함)를 끼운 JPEG */
    fun jpegWithExif(): ByteArray {
        val jpeg = encode("jpg")
        val payload = "Exif\u0000\u0000GPS 37.5665,126.9780".toByteArray()
        val length = payload.size + 2
        val app1 = byteArrayOf(0xFF.toByte(), 0xE1.toByte(), (length shr 8).toByte(), (length and 0xFF).toByte()) + payload
        return jpeg.copyOfRange(0, 2) + app1 + jpeg.copyOfRange(2, jpeg.size)
    }

    /** IHDR 뒤에 tEXt 청크("Location" 텍스트)를 끼운 PNG */
    fun pngWithText(): ByteArray {
        val png = encode("png")
        val ihdrEnd = 8 + 4 + 4 + 13 + 4
        val type = "tEXt".toByteArray()
        val data = "Location\u000037.5665,126.9780".toByteArray()
        val crc = CRC32().apply { update(type); update(data) }.value
        val chunk = int(data.size) + type + data + int(crc.toInt())
        return png.copyOfRange(0, ihdrEnd) + chunk + png.copyOfRange(ihdrEnd, png.size)
    }

    /** VP8X(EXIF·XMP 표시) + 영상 청크(VP8L) + EXIF 청크(가짜 GPS) + XMP 청크를 담은 WebP. 홀수 길이 청크는 1바이트 채움 */
    fun webpWithExif(): ByteArray {
        val vp8x = chunk("VP8X", byteArrayOf(0x0C, 0, 0, 0, 3, 0, 0, 3, 0, 0))
        val image = chunk("VP8L", byteArrayOf(0x2F, 3, 0xC0.toByte(), 0, 0, 0x07))
        val exif = chunk("EXIF", "MM\u0000*GPS 37.5665,126.9780".toByteArray())
        val xmp = chunk("XMP ", "<x:xmpmeta>Location</x:xmpmeta>".toByteArray())
        val body = "WEBP".toByteArray() + vp8x + image + exif + xmp
        return "RIFF".toByteArray() + le32(body.size) + body
    }

    /** GIF89a 1×1 */
    fun gif(): ByteArray = "GIF89a".toByteArray() + byteArrayOf(1, 0, 1, 0, 0, 0, 0, 0x2C, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 0x44, 1, 0, 0x3B)

    private fun chunk(type: String, data: ByteArray): ByteArray =
        type.toByteArray() + le32(data.size) + data + (if (data.size % 2 == 1) byteArrayOf(0) else byteArrayOf())

    fun le32(v: Int) = byteArrayOf(v.toByte(), (v shr 8).toByte(), (v shr 16).toByte(), (v shr 24).toByte())

    private fun int(v: Int) = byteArrayOf((v shr 24).toByte(), (v shr 16).toByte(), (v shr 8).toByte(), v.toByte())
}
