import { NextFunction, Request, Response } from 'express';
export function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    next();
}
export function requireRole(roles) {
    return (req, res, next) => {
        const user = req.session.user;
        if (!user || !roles.includes(user.role)) {
            return res.status(403).render('error', { title: 'Доступ запрещён', message: 'Недостаточно прав' });
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map