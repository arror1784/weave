package com.weave

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@ConfigurationPropertiesScan
// 정기 작업: 밀린 작업 옮기기(OverdueRoller) · 연결 안 된 첨부 정리(OrphanAttachmentCleaner)
@EnableScheduling
class WeaveApplication

fun main(args: Array<String>) {
    runApplication<WeaveApplication>(*args)
}
