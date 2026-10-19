// release 빌드를 배포용 키로 서명한다(사용자 결정 2026-10-19). android/는 생성 폴더라 직접 고치지 않고 이 플러그인으로 바꾼다(§2-14).
// 키 파일·비밀번호는 저장소 밖 ~/.gradle/gradle.properties에서 읽는다 — WEAVE_RELEASE_STORE_FILE·_STORE_PASSWORD·_KEY_ALIAS·_KEY_PASSWORD.
// 값이 없으면 release 빌드가 실패한다(공개 디버그 키로 몰래 서명되지 않게).
const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE_SIGNING = `
        release {
            if (project.hasProperty('WEAVE_RELEASE_STORE_FILE')) {
                storeFile file(WEAVE_RELEASE_STORE_FILE)
                storePassword WEAVE_RELEASE_STORE_PASSWORD
                keyAlias WEAVE_RELEASE_KEY_ALIAS
                keyPassword WEAVE_RELEASE_KEY_PASSWORD
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (c) => {
    let gradle = c.modResults.contents;
    if (!gradle.includes('WEAVE_RELEASE_STORE_FILE')) {
      gradle = gradle.replace(/signingConfigs \{/, `signingConfigs {${RELEASE_SIGNING}`);
    }
    // buildTypes.release의 디버그 서명을 배포용으로
    gradle = gradle.replace(
      /(release \{[^}]*?)signingConfig signingConfigs\.debug/,
      '$1signingConfig signingConfigs.release',
    );
    if (!gradle.includes('signingConfig signingConfigs.release')) {
      throw new Error('with-release-signing: build.gradle의 release 서명 위치를 찾지 못했다 — Expo 템플릿이 바뀌었는지 확인');
    }
    c.modResults.contents = gradle;
    return c;
  });
};
