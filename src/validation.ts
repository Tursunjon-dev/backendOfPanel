import { z } from 'zod'

export const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(4).max(128),
})

export const categorySchema = z.object({
	name: z.string().min(2).max(80),
	img: z.string().optional().default('default.webp'),
})

export const categoryUpdateSchema = z.object({
	name: z.string().min(2).max(80).optional(),
	img: z.string().optional(),
})
export const categoryPatchSchema = categorySchema.partial()

export const itemCreateSchema = z.object({
	title: z.string().min(1).max(200),
	category: z.string().min(1).max(50),
	price: z.number().positive(),
	image: z.string().min(1).max(200),
	isActive: z.boolean().optional().default(true),
})
export const itemUpdateSchema = itemCreateSchema.partial()
