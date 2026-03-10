import { z } from 'zod';

export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
export const registerSchema = loginSchema.extend({ officerNumber: z.string().min(1) });
export const code21Schema = z.object({ serviceRequestNumber: z.string(), addressLabel: z.string(), latitude: z.number(), longitude: z.number(), status: z.string() });
