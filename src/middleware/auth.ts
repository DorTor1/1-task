import type { NextFunction, Request, Response } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req.session as any).user) {
    return res.redirect('/auth/login');
  }
  next();
}

export function requireRole(roles: Array<'MANAGER' | 'ENGINEER' | 'OBSERVER'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req.session as any).user;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).render('error', { title: 'Доступ запрещён', message: 'Недостаточно прав' });
    }
    next();
  };
}


