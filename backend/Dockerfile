# 운영 이미지 — jar는 Mac에서 ./gradlew bootJar로 만든 것을 넣는다(2GB 서버에서 Gradle 빌드는 느리다).
# 빌드: deploy/build.sh가 jar를 만든 뒤 이 파일로 이미지를 만든다.
FROM eclipse-temurin:25-jre
RUN useradd --system --uid 10001 weave && mkdir -p /data/uploads && chown -R weave /data
USER weave
WORKDIR /app
COPY build/libs/weave-*.jar app.jar
EXPOSE 8080
# 2GB 서버에서 DB·Caddy와 함께 돈다 — 힙은 메모리의 절반까지
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=50", "-jar", "/app/app.jar"]
