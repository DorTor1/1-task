import { Router } from 'express';
import { DefectStatus, Priority } from '@prisma/client';
import ExcelJS from 'exceljs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireAuth, requireRole } from '../middleware/auth';
import prisma from '../utils/prisma';
import { writeFile } from 'node:fs/promises';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const byStatus = await prisma.defect.groupBy({ by: ['status'], _count: { _all: true } });
  const byPriority = await prisma.defect.groupBy({ by: ['priority'], _count: { _all: true } });
  const byProject = await prisma.defect.groupBy({ by: ['projectId'], _count: { _all: true } });
  const projectIds = byProject.map((p) => p.projectId);
  const projects = projectIds.length
    ? await prisma.project.findMany({ where: { id: { in: projectIds } } })
    : [];
  const byProjectWithNames = byProject.map((p) => ({
    projectId: p.projectId,
    name: projects.find((x) => x.id === p.projectId)?.name || 'Неизвестно',
    count: (p as any)._count._all as number,
  }));

  const statusMap: Record<DefectStatus, string> = {
    NEW: 'Новая',
    IN_PROGRESS: 'В работе',
    IN_REVIEW: 'На проверке',
    CLOSED: 'Закрыта',
    CANCELLED: 'Отменена',
  };
  const priorityMap: Record<Priority, string> = {
    LOW: 'Низкий',
    MEDIUM: 'Средний',
    HIGH: 'Высокий',
    CRITICAL: 'Критический',
  };

  const statusChart = {
    labels: byStatus.map((s) => statusMap[s.status] || s.status),
    counts: byStatus.map((s) => s._count._all),
  };

  const priorityChart = {
    labels: byPriority.map((p) => priorityMap[p.priority] || p.priority),
    counts: byPriority.map((p) => p._count._all),
  };

  const projectChart = {
    labels: byProjectWithNames.map((p) => p.name),
    counts: byProjectWithNames.map((p) => p.count),
  };

  res.render('reports/index', {
    title: 'Отчёты',
    byStatus,
    byPriority,
    byProject: byProjectWithNames,
    statusChart,
    priorityChart,
    projectChart,
  });
});

router.get('/export/csv', requireRole(['MANAGER']), async (req, res) => {
  const defects = await prisma.defect.findMany({ include: { project: true, stage: true, reporter: true, assignee: true } });
  const filePath = path.join(process.cwd(), 'uploads', `defects-${Date.now()}.csv`);
  const headers = ['ID', 'Название', 'Статус', 'Приоритет', 'Проект', 'Этап', 'Исполнитель', 'Автор', 'Создан'];
  const rows = defects.map((d) => [
    d.id,
    d.title,
    d.status,
    d.priority,
    d.project.name,
    d.stage?.name || '',
    d.assignee?.name || '',
    d.reporter.name,
    d.createdAt.toISOString(),
  ]);
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';'))
    .join('\n');
  await writeFile(filePath, csvContent, 'utf8');
  res.download(filePath);
});

router.get('/export/xlsx', requireRole(['MANAGER']), async (req, res) => {
  const defects = await prisma.defect.findMany({ include: { project: true, stage: true, reporter: true, assignee: true } });
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Defects');
  sheet.addRow(['ID', 'Название', 'Статус', 'Приоритет', 'Проект', 'Этап', 'Исполнитель', 'Автор', 'Создан']);
  defects.forEach((d) => {
    sheet.addRow([
      d.id,
      d.title,
      d.status,
      d.priority,
      d.project.name,
      d.stage?.name || '',
      d.assignee?.name || '',
      d.reporter.name,
      d.createdAt.toISOString(),
    ]);
  });
  const filePath = path.join(process.cwd(), 'uploads', `defects-${Date.now()}.xlsx`);
  await workbook.xlsx.writeFile(filePath);
  res.download(filePath);
});

export default router;


