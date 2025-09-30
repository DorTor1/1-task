import { beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'file:./dev.db';
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
});
afterAll(() => {
    // noop for sqlite
});
//# sourceMappingURL=setup.js.map