# Деплой

## Подготовка окружения
- Node.js 20+
- sqlite3 (опционально)
- Переменные окружения:
  - `DATABASE_URL=file:./dev.db`
  - `SESSION_SECRET=случайная_строка`

## Шаги
```bash
npm ci
npm run prisma:migrate
npm run seed
npm run build
npm start
```

## Сервис в Windows (nssm)
- `nssm install ControlSystem "C:\\Program Files\\nodejs\\node.exe" "dist\\server.js"`

## Бэкап
- Бэкап БД выполняется по cron внутри приложения (копирование `dev.db` ежедневно).
