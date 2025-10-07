import type { NextFunction, Request, Response } from 'express';
export declare function requireAuth(req: Request, res: Response, next: NextFunction): void;
export declare function requireRole(roles: Array<'MANAGER' | 'ENGINEER' | 'OBSERVER'>): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map