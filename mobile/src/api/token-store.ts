import * as SecureStore from 'expo-secure-store';

// 토큰 보관(루트 CLAUDE.md §3-2): 리프레시 토큰은 기기 보안 저장소, 액세스 토큰은 메모리에만.
// AsyncStorage·일반 파일에 토큰을 두지 않는다.

const REFRESH_KEY = 'weave.refreshToken';
let accessToken: string | null = null;

export const tokenStore = {
  getAccess: () => accessToken,
  setAccess: (token: string | null) => {
    accessToken = token;
  },
  getRefresh: () => SecureStore.getItemAsync(REFRESH_KEY),
  setRefresh: (token: string) => SecureStore.setItemAsync(REFRESH_KEY, token),
  async clear() {
    accessToken = null;
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};
