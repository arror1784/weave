---
name: add-native-module
description: weave 앱(Expo SDK 57)에 네이티브 패키지를 추가하는 절차 — expo install → app.config 플러그인·권한 문구 → expo-doctor → 개발 빌드 재생성 → 확인.
---

# 네이티브 패키지 추가 런북

1. `.claude/rules/native-modules.md`를 읽고, 해당 패키지의 SDK 57 문서를 확인한다.
2. `cd mobile && npx expo install <패키지>` (개발 도구면 `-- -D` 후 `devDependencies` 위치 확인).
3. config plugin·권한이 필요하면 `app.config.ts`의 `plugins`에 추가하고 권한 설명 문구를 쓴다.
4. 테스트에서 import되는 모듈이면 `jest.setup.ts`에 목 추가.
5. 게이트: `npx tsc --noEmit && npm run lint && npm test && npx expo-doctor && npx expo export --platform android`.
6. 네이티브 코드가 있으면 `npx expo run:android`로 개발 빌드를 다시 만들어 에뮬레이터/실기기에서 동작 확인. 불가능하면 "미확인"으로 보고.
7. `ios/`·`android/` 폴더가 생겨도 커밋하지 않는다(`.gitignore`됨).
