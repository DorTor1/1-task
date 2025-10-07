import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { z } from 'zod';
const prisma = new PrismaClient();
const router = Router();
const loginSchema = z.object({
    email: z.string().email('Неверный e-mail'),
    password: z.string().min(6, 'Минимум 6 символов'),
});
router.get('/login', (req, res) => {
    if (req.session.user)
        return res.redirect('/');
    res.render('auth/login', { title: 'Вход', errors: null, values: { email: '' } });
});
router.post('/login', async (req, res) => {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) {
        const errors = parse.error.flatten().fieldErrors;
        return res.status(400).render('auth/login', {
            title: 'Вход',
            errors,
            values: { email: req.body?.email ?? '' },
        });
    }
    const { email, password } = parse.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        return res.status(401).render('auth/login', {
            title: 'Вход',
            errors: { email: ['Пользователь не найден'] },
            values: { email },
        });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
        return res.status(401).render('auth/login', {
            title: 'Вход',
            errors: { password: ['Неверный пароль'] },
            values: { email },
        });
    }
    req.session.user = { id: user.id, email: user.email, name: user.name, role: user.role };
    res.redirect('/');
});
router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/auth/login');
    });
});
const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['MANAGER', 'ENGINEER', 'OBSERVER']).default('ENGINEER'),
});
router.get('/register', (req, res) => {
    res.render('auth/register', { title: 'Регистрация', errors: null, values: {} });
});
router.post('/register', async (req, res) => {
    const parse = registerSchema.safeParse(req.body);
    if (!parse.success) {
        const errors = parse.error.flatten().fieldErrors;
        return res.status(400).render('auth/register', { title: 'Регистрация', errors, values: req.body });
    }
    const { name, email, password, role } = parse.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        return res.status(400).render('auth/register', {
            title: 'Регистрация',
            errors: { email: ['E-mail уже используется'] },
            values: req.body,
        });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, email, passwordHash, role } });
    req.session.user = { id: user.id, email: user.email, name: user.name, role: user.role };
    res.redirect('/');
});
export default router;
//# sourceMappingURL=auth.js.map