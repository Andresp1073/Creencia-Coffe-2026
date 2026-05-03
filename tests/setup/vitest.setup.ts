import '@testing-library/jest-dom/vitest';
import { beforeAll, vi } from 'vitest';

beforeAll(() => {
  vi.mock('@/lib/db', () => ({
    query: vi.fn(),
    queryMany: vi.fn(),
    queryOne: vi.fn(),
    pool: vi.fn(),
  }));

  vi.mock('jose', () => ({
    jwtVerify: vi.fn(),
    SignJWT: vi.fn().mockReturnValue({
      setProtectedHeader: vi.fn().mockReturnThis(),
      setIssuedAt: vi.fn().mockReturnThis(),
      setExpirationTime: vi.fn().mockReturnThis(),
      sign: vi.fn().mockResolvedValue('mock-token'),
    }),
  }));

  global.fetch = vi.fn();
});