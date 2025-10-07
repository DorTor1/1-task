import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import session from 'express-session';
import path from 'node:path';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import csrf from 'csurf';
import ejsMate from 'ejs-mate';
import authRouter from './ui/auth';
import projectsRouter from './ui/projects';
import defectsRouter from './ui/defects';
import reportsRouter from './ui/reports';
import prisma from './utils/prisma';

const app = express();

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'src', 'views'));

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

if (process.env.NODE_ENV !== 'test') {
  app.use(csrf());
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.locals.csrfToken = (req as any).csrfToken ? (req as any).csrfToken() : '';
    next();
  });
} else {
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.locals.csrfToken = '';
    next();
  });
}

app.use((req: Request, res: Response, next: NextFunction) => {
  res.locals.user = (req.session as any).user || null;
  next();
});

app.get('/', async (req, res) => {
  if (!(req.session as any).user) return res.redirect('/auth/login');
  const stats = await prisma.defect.groupBy({ by: ['status'], _count: { _all: true } });
  res.render('index', { title: 'Панель управления', stats });
});

app.use('/auth', authRouter);
app.use('/projects', projectsRouter);
app.use('/defects', defectsRouter);
app.use('/reports', reportsRouter);

app.use((req, res) => {
  res.status(404).render('404', { title: 'Страница не найдена' });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  const message = err.message || 'Внутренняя ошибка сервера';
  res.status(err.status || 500);
  if (req.headers['content-type']?.includes('application/json')) {
    return res.json({ error: message });
  }
  res.render('error', { title: 'Ошибка', message });
});

export default app;

