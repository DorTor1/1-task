import { Router } from 'express';
import { PrismaClient, DefectStatus, Priority } from '@prisma/client';
import { createObjectCsvWriter } from 'csv-writer';
import ExcelJS from 'exceljs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireAuth, requireRole } from '../middleware/auth';
const prisma = new PrismaClient();
const router = Router();
router.use(requireAuth);
router.get('/', async (req, res) => {
    const byStatus = await prisma.defect.groupBy({ by: ['status'], _count: { _all: true } });
    const byPriority = await prisma.defect.groupBy({ by: ['priority'], _count: { _all: true } });
    res.render('reports/index', { title: 'Отчёты', byStatus, byPriority });
});
router.get('/export/csv', requireRole(['MANAGER']), async (req, res) => {
    const defects = await prisma.defect.findMany({ include: { project: true, stage: true, reporter: true, assignee: true } });
    const filePath = path.join(process.cwd(), 'uploads', `defects-${Date.now()}.csv`);
    const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
            { id: 'id', title: 'ID' },
            { id: 'title', title: 'Название' },
            { id: 'status', title: 'Статус' },
            { id: 'priority', title: 'Приоритет' },
            { id: 'project', title: 'Проект' },
            { id: 'stage', title: 'Этап' },
            { id: 'assignee', title: 'Исполнитель' },
            { id: 'reporter', title: 'Автор' },
            { id: 'createdAt', title: 'Создан' },
        ],
        encoding: 'utf8',
        fieldDelimiter: ';',
        alwaysQuote: true,
    });
    await csvWriter.writeRecords(defects.map((d) => ({
        id: d.id,
        title: d.title,
        status: d.status,
        priority: d.priority,
        project: d.project.name,
        stage: d.stage?.name || '',
        assignee: d.assignee?.name || '',
        reporter: d.reporter.name,
        createdAt: d.createdAt.toISOString(),
    })));
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
//# sourceMappingURL=reports.js.map