package com.weave

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication

@SpringBootApplication
@ConfigurationPropertiesScan
class WeaveApplication

fun main(args: Array<String>) {
    runApplication<WeaveApplication>(*args)
}
