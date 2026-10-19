package com.weave.global.validation

import ch.qos.logback.classic.Level
import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.read.ListAppender
import com.weave.activity.dto.AppEvent
import com.weave.activity.dto.AppEventsRequest
import com.weave.ai.dto.ChatMessage
import com.weave.ai.dto.ChatProjectInfo
import com.weave.ai.dto.ChatTask
import com.weave.ai.dto.ProjectChatRequest
import com.weave.project.dto.CreateProjectRequest
import com.weave.project.dto.CreateTaskRequest
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContain
import jakarta.validation.Validation
import org.slf4j.LoggerFactory

/**
 * 목록 안의 항목도 검증한다(§3-7) — `@Valid`는 목록이 아니라 항목 타입에 붙인다.
 * 목록에 붙이면 Hibernate Validator가 HV000271(곧 없어질 방식) 경고를 운영 로그에 남겼다(2026-10-19 배포 후 가입 때).
 */
class NestedListValidationTest : FunSpec({
    val validator = Validation.buildDefaultValidatorFactory().validator
    fun paths(target: Any) = validator.validate(target).map { it.propertyPath.toString() }

    val logger = LoggerFactory.getLogger("org.hibernate.validator.internal.metadata.aggregated.CascadingMetaDataBuilder") as Logger
    val appender = ListAppender<ILoggingEvent>()

    beforeSpec {
        logger.level = Level.WARN
        appender.start()
        logger.addAppender(appender)
    }
    afterSpec { logger.detachAppender(appender) }

    test("앱 사용 기록 묶음은 기록 한 줄씩 검증한다") {
        paths(AppEventsRequest(events = listOf(AppEvent(type = "")))) shouldContain "events[0].type"
    }

    test("프로젝트 등록은 작업 하나씩 검증한다") {
        val task = CreateTaskRequest(key = "t1", title = "", estimatedHours = 1.0)
        val request = CreateProjectRequest(name = "캡스톤", color = "teal", tasks = listOf(task))
        paths(request) shouldContain "tasks[0].title"
    }

    test("챗봇 요청은 메시지와 메시지 안의 작업 목록까지 검증한다") {
        val badTask = ChatTask(title = "가".repeat(201), estimatedHours = 1.0)
        val request = ProjectChatRequest(
            project = ChatProjectInfo(name = "캡스톤"),
            messages = listOf(ChatMessage(role = "system"), ChatMessage(role = "assistant", tasks = listOf(badTask))),
        )
        val found = paths(request)
        found shouldContain "messages[0].role"
        found shouldContain "messages[1].tasks[0].title"
    }

    test("목록에 @Valid를 붙인 곳이 없다 — HV000271 경고가 나오지 않는다") {
        appender.list.filter { it.formattedMessage.contains("HV000271") }.map { it.formattedMessage }.shouldBeEmpty()
    }
})
