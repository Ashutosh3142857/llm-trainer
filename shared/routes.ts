import { z } from 'zod';
import { insertModelSchema, models } from './schema';

export { insertModelSchema };

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  models: {
    list: {
      method: 'GET' as const,
      path: '/api/models' as const,
      responses: {
        200: z.array(z.custom<typeof models.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/models/:id' as const,
      responses: {
        200: z.custom<typeof models.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/models' as const,
      input: insertModelSchema,
      responses: {
        201: z.custom<typeof models.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    train: {
      method: 'POST' as const,
      path: '/api/models/:id/train' as const,
      responses: {
        200: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
      },
    },
    inference: {
      method: 'POST' as const,
      path: '/api/models/:id/inference' as const,
      input: z.object({
        temperature: z.number().min(0.1).max(2.0).optional().default(0.5),
        numSamples: z.number().min(1).max(50).optional().default(20),
      }),
      responses: {
        200: z.object({
          samples: z.array(z.string()),
        }),
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/models/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    }
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type ModelResponse = z.infer<typeof api.models.get.responses[200]>;
export type InferenceInput = z.infer<typeof api.models.inference.input>;
export type InferenceResponse = z.infer<typeof api.models.inference.responses[200]>;
