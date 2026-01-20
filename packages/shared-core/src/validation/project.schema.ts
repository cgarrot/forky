import { z } from 'zod';

export const projectCreateSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name is too long'),
  description: z.string().max(1000, 'Description is too long').optional(),
  systemPrompt: z.string().max(10000, 'System prompt is too long').optional(),
});

export const projectUpdateSchema = z.object({
  id: z.string().min(1, 'Project ID is required'),
  name: z.string().min(1, 'Project name cannot be empty').max(100).optional(),
  description: z.string().max(1000).optional(),
  systemPrompt: z.string().max(10000).optional(),
  quickActions: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1).max(50),
        instruction: z.string().min(1).max(1000),
        order: z.number().int().min(0),
      })
    )
    .optional(),
  viewport: z
    .object({
      x: z.number().finite(),
      y: z.number().finite(),
      zoom: z.number().min(0.1).max(5),
    })
    .optional(),
});

export const projectDeleteSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
});

export const quickActionCreateSchema = z.object({
  label: z.string().min(1, 'Label is required').max(50, 'Label is too long'),
  instruction: z.string().min(1, 'Instruction is required').max(1000, 'Instruction is too long'),
});

export const quickActionUpdateSchema = z.object({
  id: z.string().min(1, 'Quick action ID is required'),
  label: z.string().min(1).max(50).optional(),
  instruction: z.string().min(1).max(1000).optional(),
  order: z.number().int().min(0).optional(),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type ProjectDeleteInput = z.infer<typeof projectDeleteSchema>;
export type QuickActionCreateInput = z.infer<typeof quickActionCreateSchema>;
export type QuickActionUpdateInput = z.infer<typeof quickActionUpdateSchema>;
