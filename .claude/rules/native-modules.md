# 네이티브 패키지 추가 규칙 (mobile)

1. 먼저 Expo 공식 모듈이 있는지 확인한다(`https://docs.expo.dev/versions/v57.0.0/`). 서드파티보다 Expo 모듈을 우선한다.
2. 설치는 **`npx expo install <패키지>`로만.** `npm install <패키지>`는 SDK와 버전이 어긋나 빌드를 깨뜨린다. 개발 도구는 `npx expo install <패키지> -- -D`로 설치한 뒤 `package.json`에서 `devDependencies`에 들어갔는지 확인한다(섞여 들어가는 경우가 있었다).
3. 예외: TypeScript는 `npm install -D --save-exact typescript@6.0.3`로 고정한다.
4. 설치 후 `npx expo-doctor` 통과를 확인한다.
5. 권한이 필요한 패키지는 `app.config.ts`의 `plugins`에 권한 설명 문구를 넣는다(없으면 iOS는 즉시 종료).
6. 네이티브 코드가 있는 패키지면 개발 빌드를 다시 만든다: `npx expo run:android`. Expo Go로 확인했다고 끝내지 않는다.
7. 테스트에서 import되면 `jest.setup.ts`에 목을 추가한다(없으면 "native module is null").
8. peer 의존성 충돌(ERESOLVE)이 나면 `--force`/`--legacy-peer-deps`로 덮지 말고 원인 패키지를 SDK 고정 버전으로 맞춘다(예: `react-dom`은 `npx expo install react-dom`으로 SDK가 고정한 19.2.3).
