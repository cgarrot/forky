import { z } from 'zod';

export const nodePromptSchema = z.object({
  prompt: z
    .string()
    .min(1, 'Prompt cannot be empty')
    .max(10000, 'Prompt is too long'),
});

export const nodeUpdateSchema = z.object({
  id: z.string().min(1, 'Node ID is required'),
  prompt: z.string().min(1, 'Prompt cannot be empty').max(10000).optional(),
  response: z.string().max(50000, 'Response is too long').optional(),
  summary: z.string().max(1000, 'Summary is too long').optional(),
  status: z.enum(['idle', 'loading', 'error', 'stale']).optional(),
  position: z
    .object({
      x: z.number().finite(),
      y: z.number().finite(),
    })
    .optional(),
  parentIds: z.array(z.string().min(1)).max(20, 'Too many parents').optional(),
  metadata: z
    .object({
      tags: z.array(z.string()).optional(),
      color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
      customData: z.record(z.any()).optional(),
    })
    .optional(),
});

export const nodeCreateSchema = z.object({
  prompt: z.string().min(1, 'Prompt cannot be empty').max(10000),
  position: z
    .object({
      x: z.number().finite(),
      y: z.number().finite(),
    })
    .optional(),
  parentIds: z.array(z.string().min(1)).max(20).optional(),
  metadata: z
    .object({
      tags: z.array(z.string()).optional(),
      color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
      customData: z.record(z.any()).optional(),
    })
    .optional(),
});

export const nodeGenerateSchema = z.object({
  nodeId: z.string().min(1, 'Node ID is required'),
  context: z.string().max(50000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(128000).optional(),
});

export const nodeDeleteSchema = z.object({
  nodeId: z.string().min(1, 'Node ID is required'),
});

export type NodePromptInput = z.infer<typeof nodePromptSchema>;
export type NodeUpdateInput = z.infer<typeof nodeUpdateSchema>;
export type NodeCreateInput = z.infer<typeof nodeCreateSchema>;
export type NodeGenerateInput = z.infer<typeof nodeGenerateSchema>;
export type NodeDeleteInput = z.infer<typeof nodeDeleteSchema>;
