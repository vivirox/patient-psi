import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = loginSchema.extend({
  name: z.string().min(2),
});

export const patientSchema = z.object({
  name: z.string().min(2),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(['male', 'female', 'other']),
  contactNumber: z.string().optional(),
  email: z.string().email().optional(),
  notes: z.string().optional(),
});

export const chatSchema = z.object({
  title: z.string().min(1),
  patientId: z.string().uuid(),
});

export const messageSchema = z.object({
  content: z.string().min(1),
  chatId: z.string().uuid(),
});

export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = await request.json();
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map((e) => e.message).join(', '),
      };
    }
    return { success: false, error: 'Invalid request data' };
  }
}
