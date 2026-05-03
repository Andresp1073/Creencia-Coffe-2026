import { describe, it, expect } from 'vitest';
import { formatCOP } from '@/lib/utils';

describe('formatCOP', () => {
  it('should format positive number as COP currency', () => {
    const result = formatCOP(25000);
    expect(result).toContain('25.000');
  });

  it('should format zero correctly', () => {
    const result = formatCOP(0);
    expect(result).toContain('0');
  });

  it('should handle large numbers', () => {
    const result = formatCOP(1000000);
    expect(result).toContain('1.000.000');
  });

  it('should handle NaN and return $0', () => {
    const result = formatCOP(NaN);
    expect(result).toContain('0');
  });

  it('should handle undefined and return $0', () => {
    const result = formatCOP(undefined as any);
    expect(result).toContain('0');
  });

  it('should handle negative numbers', () => {
    const result = formatCOP(-5000);
    expect(result).toContain('5.000');
  });
});