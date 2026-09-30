import { AppText } from './AppText';

/** 섹션 라벨 (Figma: 작고 굵은 보조색 글자). 영문 대문자 변환은 한국어에 의미가 없어 쓰지 않는다. */
export function SectionLabel({ children }: { children: string }) {
  return (
    <AppText variant="fieldLabel" tone="soft" style={{ marginBottom: 10 }}>
      {children}
    </AppText>
  );
}
