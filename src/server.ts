import express, { NextFunction, Request, Response } from 'express';
import session from 'express-session';
import path from 'node:path';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import csrf from 'csurf';
import { fileURLToPath } from 'node:url';
import { PrismaClient, Role } from '../prisma/generated/prisma';
import authRouter from './ui/auth';
import projectsRouter from './ui/projects';
import defectsRouter from './ui/defects';
import reportsRouter from './ui/reports';

const prisma = new PrismaClient();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/public', express.static(path.join(process.cwd(), 'public')));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8 },
  })
);

// csrf токен только для форм (UI). Для JSON-API можно было бы отключить.
app.use(csrf());

app.use((req: Request, res: Response, next: NextFunction) => {
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
  res.locals.user = (req.session as any).user || null;
  next();
});

app.get('/', async (req, res) => {
  if (!(req.session as any).user) return res.redirect('/auth/login');
  const stats = await prisma.defect.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  res.render('index', { title: 'Панель управления', stats });
});

app.use('/auth', authRouter);
app.use('/projects', projectsRouter);
app.use('/defects', defectsRouter);
app.use('/reports', reportsRouter);

// Простая страница 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'Страница не найдена' });
});

// Ошибки
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  const message = err.message || 'Внутренняя ошибка сервера';
  res.status(err.status || 500);
  if (req.headers['content-type']?.includes('application/json')) {
    return res.json({ error: message });
  }
  res.render('error', { title: 'Ошибка', message });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`Server started: http://localhost:${PORT}`);
});

export default app;

