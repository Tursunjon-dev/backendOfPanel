import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const r = schema.safeParse(req.body);
    if (!r.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: r.error.errors.map((e: { path: any[]; message: any }) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    req.body = r.data as any;
    next();
  };
}

export const Z = {
  login: z.object({
    email: z.string().min(3),
    password: z.string().min(3),
  }),

  categoryCreate: z.object({
    name: z.string().min(1).max(80),
    image: z.string().optional().default(''),
  }),

  categoryUpdate: z.object({
    name: z.string().min(1).max(80).optional(),
    image: z.string().optional(),
  }),

  itemCreate: z.object({
    title: z.string().min(1).max(140),
    categorySlug: z.string().min(1),
    price: z.number().positive(),
    image: z.string().optional().default(''),
    isActive: z.boolean().optional().default(true),
  }),

  itemUpdate: z.object({
    title: z.string().min(1).max(140).optional(),
    categorySlug: z.string().min(1).optional(),
    price: z.number().positive().optional(),
    image: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
};
