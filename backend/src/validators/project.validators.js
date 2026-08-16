import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const createProjectSchema = z.object({
  name: z.string().trim().min(2, 'Project name must be at least 2 characters').max(120),
  key: z.string().trim().max(8).optional(),
  description: z.string().max(4000).optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  startDate: z.coerce.date().optional(),
  deadline: z.coerce.date().optional(),
  tags: z.array(z.string().trim().max(30)).max(12).optional(),
  color: z.string().max(20).optional(),
  memberIds: z.array(objectId).max(50).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const memberSchema = z.object({
  userId: objectId,
  projectRole: z.enum(['owner', 'manager', 'contributor']).optional(),
});
