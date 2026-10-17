import { useNavigate } from 'react-router';

import { TopBar } from '@/components/TopBar';
import { Btn, Card } from '@/components/ui';

/** 등록 초안은 메모리에만 있어서 새로고침하면 사라진다 — 처음부터 다시 하라고 안내한다 */
export function NoDraft({ step }: { step: 2 | 3 }) {
  const navigate = useNavigate();
  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-[560px] px-8 py-20">
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <h1 className="text-[18px] font-bold">{step === 2 ? 'AI 챗봇' : '작업 검토'}</h1>
          <p className="text-[15px]">등록 중인 프로젝트가 없어요.</p>
          <p className="text-[14px] text-ink-soft">페이지를 새로 열면 쓰던 내용이 사라져요. 기본 정보부터 다시 시작해 주세요.</p>
          <Btn className="mt-3" onClick={() => navigate('/')}>
            홈으로
          </Btn>
        </Card>
      </main>
    </>
  );
}
