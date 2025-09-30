import { describe, it, expect } from 'vitest';
import { createSchema, updateSchema, statusSchema } from '../../src/ui/defects';

describe('defects validation', () => {
  it('createSchema valid minimal', () => {
    const res = createSchema.safeParse({ title: 'abc', projectId: crypto.randomUUID() });
    expect(res.success).toBe(true);
  });
  it('createSchema invalid title', () => {
    const res = createSchema.safeParse({ title: 'ab', projectId: crypto.randomUUID() });
    expect(res.success).toBe(false);
  });
  it('updateSchema requires title', () => {
    const res = updateSchema.safeParse({ title: 'new title', priority: 'MEDIUM' });
    expect(res.success).toBe(true);
  });
  it('statusSchema enum', () => {
    const res = statusSchema.safeParse({ status: 'IN_PROGRESS' });
    expect(res.success).toBe(true);
  });
  it('statusSchema rejects wrong', () => {
    const res = statusSchema.safeParse({ status: 'UNKNOWN' as any });
    expect(res.success).toBe(false);
  });
});


