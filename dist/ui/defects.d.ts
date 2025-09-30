import { DefectStatus } from '@prisma/client';
import { z } from 'zod';
declare const router: import("express-serve-static-core").Router;
export declare const createSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    priority: z.ZodDefault<z.ZodEnum<{
        LOW: "LOW";
        MEDIUM: "MEDIUM";
        HIGH: "HIGH";
        CRITICAL: "CRITICAL";
    }>>;
    projectId: z.ZodString;
    stageId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    assigneeId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dueAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const updateSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    priority: z.ZodEnum<{
        LOW: "LOW";
        MEDIUM: "MEDIUM";
        HIGH: "HIGH";
        CRITICAL: "CRITICAL";
    }>;
    stageId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    assigneeId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dueAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const statusSchema: z.ZodObject<{
    status: z.ZodEnum<{
        NEW: "NEW";
        IN_PROGRESS: "IN_PROGRESS";
        IN_REVIEW: "IN_REVIEW";
        CLOSED: "CLOSED";
        CANCELLED: "CANCELLED";
    }>;
}, z.core.$strip>;
export declare const allowedTransitions: Record<DefectStatus, DefectStatus[]>;
export default router;
//# sourceMappingURL=defects.d.ts.map