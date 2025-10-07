# СистемаКонтроля: управление дефектами на стройобъектах

## Описание
Монолитное веб-приложение для централизованного учёта дефектов: регистрация, назначение исполнителей, контроль статусов, аналитика и отчётность.

## Запуск
```bash
npm install
npm run prisma:migrate
npm run seed
npm run dev
```
Приложение доступно на `http://localhost:3000`.

### Тестовые пользователи
- `admin@local.com` / `admin123` (менеджер)
- `eng@local.com` / `eng12345` (инженер)

## Скрипты npm
- `npm run dev` — запуск в режиме разработки
- `npm run build` / `npm start` — сборка и запуск прод-версии
- `npm run seed` — заполнение демо-данных
- `npm run test` — Vitest (≥5 unit, ≥2 integration)
- `npm run bench` — нагрузочный тест (autocannon)

## Документация
- `docs/testing-plan.md` — план тестирования
- `docs/DEPLOY.md` — инструкция по деплою
- `docs/er-diagram.mmd` — ER-диаграмма (Mermaid)

### ER-диаграмма
```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#0d47a1'}}}%%
erDiagram
    USER ||--o{ DEFECT : "reported"
    USER ||--o{ DEFECT : "assigned"
    USER ||--o{ COMMENT : "writes"
    USER ||--o{ ATTACHMENT : "uploads"
    USER ||--o{ DEFECT_HISTORY : "changes"

    PROJECT ||--o{ STAGE : "has"
    PROJECT ||--o{ DEFECT : "contains"

    STAGE ||--o{ DEFECT : "groups"

    DEFECT ||--o{ COMMENT : "has"
    DEFECT ||--o{ ATTACHMENT : "has"
    DEFECT ||--o{ DEFECT_HISTORY : "logs"

    USER {
        string id PK
        string email UK
        string passwordHash
        string name
        enum role
        datetime createdAt
        datetime updatedAt
    }

    PROJECT {
        string id PK
        string name
        string description
        datetime createdAt
        datetime updatedAt
    }

    STAGE {
        string id PK
        string name
        int position
        string projectId FK
    }

    DEFECT {
        string id PK
        string title
        string description
        enum priority
        enum status
        datetime dueAt
        datetime createdAt
        datetime updatedAt
        string projectId FK
        string stageId FK
        string reporterId FK
        string assigneeId FK
    }

    COMMENT {
        string id PK
        string content
        datetime createdAt
        string defectId FK
        string authorId FK
    }

    ATTACHMENT {
        string id PK
        string originalName
        string storedName
        string mimeType
        int size
        string path
        datetime createdAt
        string defectId FK
        string uploadedById FK
    }

    DEFECT_HISTORY {
        string id PK
        string field
        string oldValue
        string newValue
        enum fromStatus
        enum toStatus
        string note
        datetime createdAt
        string defectId FK
        string changedById FK
    }
```

## Технологии
- Node.js, Express 5, TypeScript
- Prisma + SQLite
- EJS + EJS-mate (шаблоны)
- Chart.js для аналитики
- Helmet, CSRF, bcrypt, multer
- Vitest + Supertest (тесты)

## Структура ключевых модулей
- `src/app.ts` — инициализация сервера
- `src/ui/*` — маршруты (auth, projects, defects, reports)
- `src/views/*` — EJS-шаблоны интерфейса
- `prisma/schema.prisma` — описание БД
- `prisma/seed.ts` — сидинг демо-данных
- `tests/*` — unit и integration тесты

