import { describe, it, expect } from 'vitest';

describe('Session', () => {
  it('should export session functions', async () => {
    const session = await import('@/lib/auth/session');
    expect(typeof session.createToken).toBe('function');
    expect(typeof session.verifyToken).toBe('function');
    expect(typeof session.getSession).toBe('function');
    expect(typeof session.setSession).toBe('function');
    expect(typeof session.destroySession).toBe('function');
  });
});