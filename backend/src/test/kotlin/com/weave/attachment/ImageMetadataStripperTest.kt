package com.weave.attachment

import com.weave.attachment.service.ImageMetadataStripper
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import javax.imageio.ImageIO

class ImageMetadataStripperTest : FunSpec({
    fun containsText(bytes: ByteArray, text: String) = String(bytes, Charsets.ISO_8859_1).contains(text)

    test("JPEG의 EXIF(APP1) 세그먼트를 지우고, 그림은 그대로 읽힌다") {
        val original = TestImages.jpegWithExif()
        containsText(original, "Exif") shouldBe true
        val stripped = ImageMetadataStripper.stripJpeg(original)
        containsText(stripped, "Exif") shouldBe false
        containsText(stripped, "GPS") shouldBe false
        ImageIO.read(stripped.inputStream()) shouldNotBe null
    }

    test("PNG의 텍스트 청크(tEXt 등)를 지우고, 그림은 그대로 읽힌다") {
        val original = TestImages.pngWithText()
        containsText(original, "Location") shouldBe true
        val stripped = ImageMetadataStripper.stripPng(original)
        containsText(stripped, "Location") shouldBe false
        ImageIO.read(stripped.inputStream()) shouldNotBe null
    }

    test("WebP의 EXIF·XMP 청크를 지우고 VP8X 표시·RIFF 크기를 맞추며, 영상 청크는 그대로 둔다") {
        val original = TestImages.webpWithExif()
        val stripped = ImageMetadataStripper.stripWebp(original)
        containsText(stripped, "GPS") shouldBe false
        containsText(stripped, "Location") shouldBe false
        containsText(stripped, "VP8L") shouldBe true
        String(stripped, 0, 4, Charsets.US_ASCII) shouldBe "RIFF"
        String(stripped, 8, 4, Charsets.US_ASCII) shouldBe "WEBP"
        stripped.copyOfRange(4, 8).contentEquals(TestImages.le32(stripped.size - 8)) shouldBe true
        // VP8X 플래그(본문 첫 바이트)에서 EXIF(0x08)·XMP(0x04) 표시를 끈다
        (stripped[20].toInt() and 0x0C) shouldBe 0
    }
})
