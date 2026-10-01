package com.weave.client

import com.anthropic.client.AnthropicClient
import com.anthropic.client.okhttp.AnthropicOkHttpClient
import com.anthropic.core.JsonValue
import com.anthropic.models.messages.Base64ImageSource
import com.anthropic.models.messages.CacheControlEphemeral
import com.anthropic.models.messages.ContentBlockParam
import com.anthropic.models.messages.DocumentBlockParam
import com.anthropic.models.messages.ImageBlockParam
import com.anthropic.models.messages.JsonOutputFormat
import com.anthropic.models.messages.MessageCreateParams
import com.anthropic.models.messages.OutputConfig
import com.weave.global.config.WeaveProperties
import com.weave.global.error.ApiException
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component

/**
 * Claude API(공식 Java SDK) — 앱은 AI API를 직접 부르지 않고 항상 여기를 거친다(§3-11).
 * 모델은 사용자 결정대로 Claude Sonnet 5.5, 키는 .env의 ANTHROPIC_API_KEY.
 */
@Component
class ClaudeClient(private val properties: WeaveProperties) : AiClient {

    private val client: AnthropicClient? by lazy {
        properties.anthropic.apiKey.takeIf { it.isNotBlank() }?.let { AnthropicOkHttpClient.builder().apiKey(it).build() }
    }

    override fun complete(system: String, turns: List<AiTurn>, schema: Map<String, Any>): String {
        val api = client ?: throw ApiException(HttpStatus.SERVICE_UNAVAILABLE, "AI_UNAVAILABLE", "AI 설정이 없어요.")
        val params = MessageCreateParams.builder()
            .model(properties.anthropic.model)
            .maxTokens(MAX_TOKENS)
            .system(system)
            .outputConfig(
                OutputConfig.builder()
                    .format(
                        JsonOutputFormat.builder()
                            .schema(JsonOutputFormat.Schema.builder().putAllAdditionalProperties(schema.mapValues { JsonValue.from(it.value) }).build())
                            .build(),
                    )
                    .build(),
            )
            .apply {
                turns.forEach {
                    when {
                        it.role == "assistant" -> addAssistantMessage(it.text)
                        it.attachments.isEmpty() -> addUserMessage(it.text)
                        else -> addUserMessageOfBlockParams(blocks(it))
                    }
                }
            }
            .build()
        val message = api.messages().create(params)
        return message.content().mapNotNull { block -> block.text().orElse(null)?.text() }.joinToString("")
    }

    /**
     * 첨부 + 글. 첨부는 대화 내내 같은 첫 메시지에 붙으므로 마지막 첨부에 캐시 표시를 달아
     * 다음 질문부터는 첨부를 다시 계산하지 않게 한다(프롬프트 캐싱).
     */
    private fun blocks(turn: AiTurn): List<ContentBlockParam> {
        val cache = CacheControlEphemeral.builder().build()
        val attachments = turn.attachments.mapIndexed { i, a ->
            val last = i == turn.attachments.lastIndex
            when (a) {
                is AiAttachment.Pdf -> listOf(
                    ContentBlockParam.ofDocument(DocumentBlockParam.builder().base64Source(a.base64).title(a.title).apply { if (last) cacheControl(cache) }.build()),
                )
                is AiAttachment.Text -> listOf(
                    ContentBlockParam.ofDocument(DocumentBlockParam.builder().textSource(a.text.ifBlank { "(내용 없음)" }).title(a.title).apply { if (last) cacheControl(cache) }.build()),
                )
                is AiAttachment.Image -> listOf(
                    ContentBlockParam.ofText("첨부 사진: ${a.title}"),
                    ContentBlockParam.ofImage(
                        ImageBlockParam.builder()
                            .source(Base64ImageSource.builder().data(a.base64).mediaType(Base64ImageSource.MediaType.of(a.mediaType)).build())
                            .apply { if (last) cacheControl(cache) }
                            .build(),
                    ),
                )
            }
        }.flatten()
        return attachments + ContentBlockParam.ofText(turn.text)
    }

    companion object {
        private const val MAX_TOKENS = 8000L
    }
}
