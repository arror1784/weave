import { signupSchema } from './validation';

// 비밀번호 규칙은 Claude 임시안(사용자 확인 필요): 8~64자, 영문·숫자·특수문자 각 1개 이상, 공백 없음
const errorOf = (password: string) => {
  const result = signupSchema.safeParse({ email: 'me@example.com', password, passwordConfirm: password });
  return result.success ? null : result.error.issues[0].message;
};

describe('회원가입 비밀번호 규칙', () => {
  it('영문·숫자·특수문자가 모두 있고 8자 이상이면 통과한다', () => {
    expect(errorOf('weave2026!')).toBeNull();
  });

  it('8자 미만·64자 초과는 거절한다', () => {
    expect(errorOf('ab1!')).toBe('비밀번호는 8자 이상이어야 해요.');
    expect(errorOf(`a1!${'x'.repeat(62)}`)).toBe('비밀번호는 64자 이하로 입력해 주세요.');
  });

  it('영문·숫자·특수문자 중 하나라도 빠지면 거절한다', () => {
    for (const pw of ['weavepass!', '12345678!', 'weave2026']) expect(errorOf(pw)).toBe('영문·숫자·특수문자를 모두 넣어 주세요.');
  });

  it('공백이 있으면 거절한다', () => {
    expect(errorOf('weave 2026!')).toBe('비밀번호에 공백을 넣을 수 없어요.');
  });
});
