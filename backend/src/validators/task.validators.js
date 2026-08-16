import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const nullableObjectId = z.union([objectId, z.null(), z.literal('')]);

export const createTaskSchema = z.object({
  title: z.string().trim().min(2, 'Task title must be at least 2 characters').max(200),
  description: z.string().max(10000).optional(),
  project: objectId,
  assignee: nullableObjectId.optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  dueDate: z.union([z.coerce.date(), z.null()]).optional(),
  startDate: z.union([z.coerce.date(), z.null()]).optional(),
  labels: z.array(z.string().trim().max(30)).max(12).optional(),
  checklist: z
    .array(z.object({ text: z.string().trim().min(1).max(200), done: z.boolean().optional() }))
    .max(50)
    .optional(),
  dependsOn: z.array(objectId).max(20).optional(),
  milestone: nullableObjectId.optional(),
  estimatedHours: z.number().min(0).max(1000).optional(),
});

export const updateTaskSchema = createTaskSchema.partial().omit({ project: true });

export const moveTaskSchema = z.object({
  status: z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'done']),
  order: z.number().int().min(0).optional(),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1, 'Comment cannot be empty').max(5000),
  mentions: z.array(objectId).max(20).optional(),
});
