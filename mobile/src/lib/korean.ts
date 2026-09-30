/** 앞 단어의 받침에 맞춰 조사를 붙인다. 예: withParticle('설계 문서', '이', '가') → '설계 문서가' */
export function withParticle(word: string, withFinal: string, withoutFinal: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `${word}${withFinal}(${withoutFinal})`;
  return `${word}${code % 28 === 0 ? withoutFinal : withFinal}`;
}

/** 시간 표시: 1 → '1h', 1.5 → '1.5h' */
export function formatHours(hours: number): string {
  return `${Number(hours.toFixed(2))}h`;
}
