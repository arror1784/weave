import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getSchedule } from '@/api/projects';
import { useAuth } from '@/auth/AuthProvider';
import { queryKeys } from '@/queries/keys';

import { syncTodayWidget } from './sync-today-widget';

/**
 * 화면 없는 컴포넌트 — 앱이 일정을 새로 받을 때마다(등록·체크·다시 배치 뒤 캐시 갱신) 홈 화면 위젯을 다시 그린다.
 * 오늘 화면과 같은 일정 캐시를 쓰므로 요청이 늘지 않는다. 로그아웃하면 위젯을 "앱을 열면…" 안내로 바꾼다.
 */
export function WidgetSync() {
  const { status } = useAuth();
  const signedIn = status === 'signedIn';
  const { data } = useQuery({ queryKey: queryKeys.schedule, queryFn: getSchedule, enabled: signedIn });

  useEffect(() => {
    if (signedIn && data) syncTodayWidget(data);
    else if (status === 'signedOut') syncTodayWidget(null);
  }, [signedIn, status, data]);

  return null;
}
