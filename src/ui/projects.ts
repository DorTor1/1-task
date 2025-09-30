import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const projects = await prisma.project.findMany({ orderBy: { createdAt: 'desc' } });
  res.render('projects/list', { title: 'Проекты', projects });
});

router.get('/new', requireRole(['MANAGER']), (req, res) => {
  res.render('projects/new', { title: 'Новый проект', errors: null, values: {} });
});

const projectSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

router.post('/', requireRole(['MANAGER']), async (req, res) => {
  const parse = projectSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).render('projects/new', { title: 'Новый проект', errors: parse.error.flatten().fieldErrors, values: req.body });
  }
  const { name, description } = parse.data;
  await prisma.project.create({ data: { name, description: description || null } });
  res.redirect('/projects');
});

router.get('/:id', async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id }, include: { stages: { orderBy: { position: 'asc' } }, defects: true } });
  if (!project) return res.status(404).render('404', { title: 'Не найдено' });
  res.render('projects/detail', { title: project.name, project });
});

router.post('/:id/stages', requireRole(['MANAGER']), async (req, res) => {
  const schema = z.object({ name: z.string().min(2), position: z.coerce.number().int().nonnegative().default(0) });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).redirect(`/projects/${req.params.id}`);
  const { name, position } = parse.data;
  await prisma.stage.create({ data: { name, position, projectId: req.params.id } });
  res.redirect(`/projects/${req.params.id}`);
});

export default router;


