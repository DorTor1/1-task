import app from './app';
import cron from 'node-cron';
import fs from 'node:fs';
import path from 'node:path';
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
// Ежедневный бэкап SQLite БД
if (process.env.NODE_ENV !== 'test') {
    const backupsDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupsDir))
        fs.mkdirSync(backupsDir, { recursive: true });
    cron.schedule('0 2 * * *', () => {
        const src = path.join(process.cwd(), 'dev.db');
        const dst = path.join(backupsDir, `dev-${new Date().toISOString().slice(0, 10)}.db`);
        if (fs.existsSync(src))
            fs.copyFileSync(src, dst);
    });
}
app.listen(PORT, () => {
    console.log(`Server started: http://localhost:${PORT}`);
});
//# sourceMappingURL=server.js.map