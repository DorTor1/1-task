import { describe, it, expect } from 'vitest';
import { allowedTransitions } from '../../src/ui/defects';

describe('status transitions', () => {
  it('NEW -> IN_PROGRESS allowed', () => {
    expect(allowedTransitions.NEW.includes('IN_PROGRESS' as any)).toBe(true);
  });
  it('CLOSED has no transitions', () => {
    expect(allowedTransitions.CLOSED.length).toBe(0);
  });
});


