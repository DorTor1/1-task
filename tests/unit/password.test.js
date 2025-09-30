import { describe, it, expect } from 'vitest';
import bcrypt from 'bcrypt';
describe('password hashing', () => {
    it('bcrypt hash/compare', async () => {
        const hash = await bcrypt.hash('secret', 10);
        const ok = await bcrypt.compare('secret', hash);
        expect(ok).toBe(true);
    });
});
//# sourceMappingURL=password.test.js.map