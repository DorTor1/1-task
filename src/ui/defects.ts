import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { DefectStatus, Priority } from '@prisma/client';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import prisma from '../utils/prisma';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const query = req.query as Partial<Record<'status' | 'priority' | 'projectId' | 'assigneeId' | 'q' | 'sort', string>>;
  const filters = {
    status: query.status ?? '',
    priority: query.priority ?? '',
    projectId: query.projectId ?? '',
    assigneeId: query.assigneeId ?? '',
    q: query.q ?? '',
    sort: query.sort ?? 'createdAt_desc',
  };

  const where: Prisma.DefectWhereInput = {};
  if (filters.status && Object.values(DefectStatus).includes(filters.status as DefectStatus)) {
    where.status = filters.status as DefectStatus;
  }
  if (filters.priority && Object.values(Priority).includes(filters.priority as Priority)) {
    where.priority = filters.priority as Priority;
  }
  if (filters.projectId) {
    where.projectId = filters.projectId;
  }
  if (filters.assigneeId) {
    where.assigneeId = filters.assigneeId;
  }
  if (filters.q) {
    const search = filters.q;
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const orderMap: Partial<Record<string, Prisma.DefectOrderByWithRelationInput>> = {
    createdAt_desc: { createdAt: 'desc' },
    createdAt_asc: { createdAt: 'asc' },
    priority_desc: { priority: 'desc' },
    priority_asc: { priority: 'asc' },
    dueAt_asc: { dueAt: 'asc' },
    dueAt_desc: { dueAt: 'desc' },
  };
  const resolvedOrder: Prisma.DefectOrderByWithRelationInput = orderMap[filters.sort] ?? orderMap.createdAt_desc!;
  const orderInput: Prisma.DefectOrderByWithRelationInput[] = [resolvedOrder];

  const [defects, projects, users] = await Promise.all([
    prisma.defect.findMany({
      where,
      orderBy: orderInput,
      include: { project: true, stage: true, reporter: true, assignee: true },
    }),
    prisma.project.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findMany({ orderBy: { name: 'asc' } }),
  ]);

  const statuses = Object.values(DefectStatus);
  const priorities = Object.values(Priority);
  const sortOptions = [
    { value: 'createdAt_desc', label: 'По дате создания (новые)' },
    { value: 'createdAt_asc', label: 'По дате создания (старые)' },
    { value: 'priority_desc', label: 'По приоритету (высокие)' },
    { value: 'priority_asc', label: 'По приоритету (низкие)' },
    { value: 'dueAt_asc', label: 'По сроку (раньше)' },
    { value: 'dueAt_desc', label: 'По сроку (позже)' },
  ];

  res.render('defects/list', {
    title: 'Дефекты',
    defects,
    filters,
    statuses,
    priorities,
    projects,
    users,
    sortOptions,
  });
});

router.get('/new', requireRole(['MANAGER', 'ENGINEER']), async (req, res) => {
  const projects = await prisma.project.findMany({ include: { stages: { orderBy: { position: 'asc' } } } });
  res.render('defects/new', {
    title: 'Новый дефект',
    errors: null,
    values: {},
    projects,
    priorities: Object.keys(Priority),
  });
});

export const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  priority: z.nativeEnum(Priority).default('MEDIUM'),
  projectId: z.string().uuid(),
  stageId: z.string().uuid().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueAt: z.string().datetime().optional(),
});

router.post('/', requireRole(['MANAGER', 'ENGINEER']), async (req, res) => {
  const parse = createSchema.safeParse({
    ...req.body,
    stageId: req.body.stageId || null,
    assigneeId: req.body.assigneeId || null,
    dueAt: req.body.dueAt || undefined,
  });
  if (!parse.success) {
    const projects = await prisma.project.findMany({ include: { stages: { orderBy: { position: 'asc' } } } });
    return res.status(400).render('defects/new', {
      title: 'Новый дефект',
      errors: parse.error.flatten().fieldErrors,
      values: req.body,
      projects,
      priorities: Object.keys(Priority),
    });
  }
  const user = (req.session as any).user;
  const data = parse.data;
  const defect = await prisma.defect.create({
    data: {
      title: data.title,
      description: data.description || null,
      priority: data.priority,
      projectId: data.projectId,
      stageId: data.stageId || null,
      reporterId: user.id,
      assigneeId: data.assigneeId || null,
      dueAt: data.dueAt ? new Date(data.dueAt) : null,
    },
  });
  await prisma.defectHistory.create({
    data: {
      defectId: defect.id,
      field: 'status',
      oldValue: null,
      newValue: 'NEW',
      fromStatus: null,
      toStatus: 'NEW',
      changedById: user.id,
      note: 'Создание дефекта',
    },
  });
  res.redirect(`/defects/${defect.id}`);
});

router.get('/:id', async (req, res) => {
  const defectId = req.params.id as string;
  const defect = await prisma.defect.findUnique({
    where: { id: defectId },
    include: {
      project: { include: { stages: true } },
      stage: true,
      reporter: true,
      assignee: true,
      comments: { include: { author: true }, orderBy: { createdAt: 'desc' } },
      files: true,
      history: { orderBy: { createdAt: 'desc' }, include: { changedBy: true } },
    },
  });
  if (!defect) return res.status(404).render('404', { title: 'Не найдено' });
  res.render('defects/detail', { title: defect.title, defect, priorities: Object.keys(Priority), statuses: Object.keys(DefectStatus) });
});

router.get('/:id/edit', requireRole(['MANAGER']), async (req, res) => {
  const defectId = req.params.id as string;
  const defect = await prisma.defect.findUnique({ where: { id: defectId }, include: { project: { include: { stages: true } } } });
  if (!defect) return res.status(404).render('404', { title: 'Не найдено' });
  const users = await prisma.user.findMany();
  res.render('defects/edit', { title: 'Редактирование', defect, users, priorities: Object.keys(Priority) });
});

export const updateSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  priority: z.nativeEnum(Priority),
  stageId: z.string().uuid().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueAt: z.string().datetime().optional(),
});

router.post('/:id', requireRole(['MANAGER']), async (req, res) => {
  const parse = updateSchema.safeParse({
    ...req.body,
    stageId: req.body.stageId || null,
    assigneeId: req.body.assigneeId || null,
    dueAt: req.body.dueAt || undefined,
  });
  if (!parse.success) return res.status(400).redirect(`/defects/${req.params.id}/edit`);
  const defectId = req.params.id as string;
  const old = await prisma.defect.findUnique({ where: { id: defectId } });
  if (!old) return res.status(404).render('404', { title: 'Не найдено' });
  const user = (req.session as any).user;
  const data = parse.data;
  const updated = await prisma.defect.update({
    where: { id: defectId },
    data: {
      title: data.title,
      description: data.description || null,
      priority: data.priority,
      stageId: data.stageId || null,
      assigneeId: data.assigneeId || null,
      dueAt: data.dueAt ? new Date(data.dueAt) : null,
    },
  });
  // История по изменённым полям
  const histories = [] as Array<Parameters<typeof prisma.defectHistory.create>[0]['data']>;
  if (old.title !== updated.title) histories.push({ defectId: updated.id, field: 'title', oldValue: old.title, newValue: updated.title, changedById: user.id });
  if ((old.description || '') !== (updated.description || '')) histories.push({ defectId: updated.id, field: 'description', oldValue: old.description || '', newValue: updated.description || '', changedById: user.id });
  if (old.priority !== updated.priority) histories.push({ defectId: updated.id, field: 'priority', oldValue: old.priority, newValue: updated.priority, changedById: user.id });
  if ((old.stageId || '') !== (updated.stageId || '')) histories.push({ defectId: updated.id, field: 'stageId', oldValue: old.stageId || '', newValue: updated.stageId || '', changedById: user.id });
  if ((old.assigneeId || '') !== (updated.assigneeId || '')) histories.push({ defectId: updated.id, field: 'assigneeId', oldValue: old.assigneeId || '', newValue: updated.assigneeId || '', changedById: user.id });
  for (const h of histories) await prisma.defectHistory.create({ data: h });
  res.redirect(`/defects/${updated.id}`);
});

export const statusSchema = z.object({
  status: z.nativeEnum(DefectStatus),
});

export const allowedTransitions: Record<DefectStatus, DefectStatus[]> = {
  NEW: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['IN_REVIEW', 'CANCELLED'],
  IN_REVIEW: ['CLOSED', 'IN_PROGRESS', 'CANCELLED'],
  CLOSED: [],
  CANCELLED: [],
};

router.post('/:id/status', requireRole(['MANAGER', 'ENGINEER']), async (req, res) => {
  const parse = statusSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).redirect(`/defects/${req.params.id}`);
  const target = parse.data.status;
  const user = (req.session as any).user;
  const defectId = req.params.id as string;
  const defect = await prisma.defect.findUnique({ where: { id: defectId } });
  if (!defect) return res.status(404).render('404', { title: 'Не найдено' });
  const allowed = allowedTransitions[defect.status as DefectStatus];
  if (!allowed.includes(target)) return res.status(400).render('error', { title: 'Ошибка', message: 'Недопустимый переход статуса' });
  await prisma.$transaction([
    prisma.defect.update({ where: { id: defect.id }, data: { status: target } }),
    prisma.defectHistory.create({
      data: {
        defect: { connect: { id: defect.id } },
        field: 'status',
        fromStatus: defect.status,
        toStatus: target,
        oldValue: defect.status,
        newValue: target,
        changedBy: { connect: { id: user.id } },
        note: 'Смена статуса',
      },
    }),
  ]);
  res.redirect(`/defects/${defect.id}`);
});

router.post('/:id/delete', requireRole(['MANAGER']), async (req, res) => {
  const defectId = req.params.id as string;
  await prisma.defect.delete({ where: { id: defectId } });
  res.redirect('/defects');
});

export default router;

// Комментарии
router.post('/:id/comments', requireRole(['MANAGER', 'ENGINEER']), async (req, res) => {
  const schema = z.object({ content: z.string().min(1) });
  const parse = schema.safeParse(req.body);
  const defectId = req.params.id as string;
  if (!parse.success) return res.status(400).redirect(`/defects/${defectId}`);
  const user = (req.session as any).user;
  await prisma.comment.create({
    data: {
      content: parse.data.content,
      defect: { connect: { id: defectId } },
      author: { connect: { id: user.id } },
    },
  });
  res.redirect(`/defects/${defectId}`);
});

// Вложения
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});
const upload = multer({ storage });

router.post('/:id/attachments', requireRole(['MANAGER', 'ENGINEER']), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).redirect(`/defects/${req.params.id}`);
  const user = (req.session as any).user;
  const defectId = req.params.id as string;
  await prisma.attachment.create({
    data: {
      defect: { connect: { id: defectId } },
      uploadedBy: { connect: { id: user.id } },
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: `uploads/${req.file.filename}`,
    },
  });
  res.redirect(`/defects/${defectId}`);
});


