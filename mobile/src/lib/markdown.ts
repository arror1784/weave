export type TextPiece = { text: string; bold: boolean };

// 한 줄 안에서 **로 감싼 부분만. 짝이 없거나 줄을 넘는 **는 글자 그대로 둔다.
const BOLD = /\*\*([^*\n]+?)\*\*/g;

/** AI 답의 **굵게** 표시를 조각으로 나눈다. 예: '**가**나' → [{가, 굵게}, {나}] */
export function parseBold(text: string): TextPiece[] {
  const pieces: TextPiece[] = [];
  let last = 0;
  for (const match of text.matchAll(BOLD)) {
    if (match.index > last) pieces.push({ text: text.slice(last, match.index), bold: false });
    pieces.push({ text: match[1], bold: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) pieces.push({ text: text.slice(last), bold: false });
  return pieces;
}

/** 스크린리더용 — ** 기호만 뺀 글 */
export function stripBold(text: string): string {
  return parseBold(text).map((p) => p.text).join('');
}
