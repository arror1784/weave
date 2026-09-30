import { z } from 'zod';

// 폼 입력 검증(경계에서 Zod로, mobile/CLAUDE.md §2-5). 진짜 검증은 서버에서 다시 한다(§3-7).

const email = z.string().trim().min(1, '이메일을 입력해 주세요.').pipe(z.email('이메일 형식이 올바르지 않아요.'));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, '비밀번호를 입력해 주세요.'),
});

export const signupSchema = z
  .object({
    email,
    password: z.string().min(8, '비밀번호는 8자 이상이어야 해요.'),
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, { message: '비밀번호가 일치하지 않아요.', path: ['passwordConfirm'] });

export const projectBasicSchema = z.object({
  name: z.string().trim().min(1, '프로젝트 이름을 입력해 주세요.'),
  description: z.string().trim(),
});

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

export const taskEditSchema = z.object({
  title: z.string().trim().min(1, '작업 이름을 입력해 주세요.'),
  hours: hoursSchema,
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
