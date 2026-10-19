import type { ExpoConfig } from 'expo/config';

/** 배포 앱과 개발 빌드를 폰에 나란히 설치한다(사용자 결정 2026-10-19) — APP_VARIANT=development면 다른 패키지·이름·스킴 */
function load(variant?: string): ExpoConfig {
  const saved = process.env.APP_VARIANT;
  if (variant === undefined) delete process.env.APP_VARIANT;
  else process.env.APP_VARIANT = variant;
  try {
    let config: ExpoConfig | undefined;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      config = require('../app.config').default;
    });
    return config!;
  } finally {
    if (saved === undefined) delete process.env.APP_VARIANT;
    else process.env.APP_VARIANT = saved;
  }
}

describe('app.config 앱 종류', () => {
  it('기본은 배포 앱 — 패키지 com.weave.app(출시 후 변경 불가)·스킴 weave', () => {
    const c = load();
    expect(c.android?.package).toBe('com.weave.app');
    expect(c.scheme).toBe('weave');
    expect(c.name).toBe('weave');
  });

  it('APP_VARIANT=development면 개발 빌드 — 다른 패키지·이름·스킴이라 배포 앱과 같이 설치된다', () => {
    const c = load('development');
    expect(c.android?.package).toBe('com.weave.app.dev');
    expect(c.scheme).toBe('weave-dev');
    expect(c.name).toBe('weave dev');
  });

  it('배포 앱만 release 서명 플러그인을 쓴다', () => {
    const names = (c: ExpoConfig) => (c.plugins ?? []).map((p) => (Array.isArray(p) ? p[0] : p));
    expect(names(load())).toContain('./plugins/with-release-signing');
    expect(names(load('development'))).not.toContain('./plugins/with-release-signing');
  });
});
