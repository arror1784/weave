import { z } from 'zod';

// 폼 입력 검증(경계에서 Zod로, mobile/CLAUDE.md §2-5). 진짜 검증은 서버에서 다시 한다(§3-7).

const email = z.string().trim().min(1, '이메일을 입력해 주세요.').pipe(z.email('이메일 형식이 올바르지 않아요.'));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, '비밀번호를 입력해 주세요.'),
});

/**
 * 비밀번호 규칙 — Claude 임시안(사용자 확인 필요): 8~64자, 영문·숫자·특수문자 각 1개 이상, 공백 없음.
 * 서버도 같은 규칙으로 다시 검증해야 한다(§3-7).
 */
export const PASSWORD_HINT = '영문·숫자·특수문자를 모두 넣어 8자 이상';
const passwordRule = z
  .string()
  .min(8, '비밀번호는 8자 이상이어야 해요.')
  .max(64, '비밀번호는 64자 이하로 입력해 주세요.')
  .refine((v) => !/\s/.test(v), '비밀번호에 공백을 넣을 수 없어요.')
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v) && /[^A-Za-z\d]/.test(v), '영문·숫자·특수문자를 모두 넣어 주세요.');

export const signupSchema = z
  .object({
    email,
    password: passwordRule,
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, { message: '비밀번호가 일치하지 않아요.', path: ['passwordConfirm'] });

export const projectBasicSchema = z.object({
  name: z.string().trim().min(1, '프로젝트명을 입력해 주세요.'),
  description: z.string().trim(),
  /** 비우면 마감 없음(상시) */
  deadline: z
    .string()
    .trim()
    .refine((v) => v === '' || isValidDateKey(v), '2026-10-09처럼 입력해 주세요.')
    .transform((v) => (v === '' ? null : v)),
});

/** 참고자료 링크: http(s) 주소만 */
export const linkSchema = z
  .string()
  .trim()
  .pipe(z.url({ protocol: /^https?$/, error: 'https://로 시작하는 주소를 입력해 주세요.' }));

/** 'YYYY-MM-DD' 형식이고 실제로 있는 날짜인지 */
export function isValidDateKey(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** 빈 값은 "미정"(null), 아니면 0보다 큰 숫자 */
export const hoursSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === '') return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) {
      ctx.addIssue({ code: 'custom', message: '0보다 큰 숫자로 입력해 주세요.' });
      return z.NEVER;
    }
    return n;
  });


/** safeParse 결과를 { 필드명: 첫 오류 메시지 }로 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '');
    errors[key] ??= issue.message;
  }
  return errors;
}

export function hoursToText(hours: number | null): string {
  return hours === null ? '' : String(hours);
}
