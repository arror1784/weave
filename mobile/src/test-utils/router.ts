export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  dismissAll: jest.fn(),
  dismissTo: jest.fn(),
};

export const mockParams: { current: Record<string, string> } = { current: {} };

export function resetRouterMock() {
  Object.values(mockRouter).forEach((fn) => fn.mockClear());
  mockParams.current = {};
}
