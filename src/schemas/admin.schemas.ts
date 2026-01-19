import { z } from 'zod'

export const loginSchema = z.object({
	email: z.string().min(3),
	password: z.string().min(1),
})

export const categoryCreateSchema = z.object({
	id: z
		.string()
		.min(1)
		.max(50)
		.regex(/^[a-zA-Z0-9_-]+$/),
	name: z.string().min(1).max(100),
	category: z.string().min(1).max(50),
	img: z.string().optional().default('default.webp'),
	sort: z.coerce.number().int().optional().default(0),
})

export const categoryUpdateSchema = categoryCreateSchema
	.partial()
	.omit({ id: true })

export const itemCreateSchema = z.object({
	title: z.string().min(1).max(200),
	category: z.string().min(1).max(50),
	price: z.coerce.number().positive(),
	image: z.string().optional().default('default.webp'),
	isActive: z.coerce.boolean().optional().default(true),
})

export const itemUpdateSchema = itemCreateSchema.partial()
