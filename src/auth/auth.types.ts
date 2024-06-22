import { z } from 'zod';

// GET /auth/user
export type GetUserResult = {
    success: boolean;
    error?: string;
    firstName?: string;
    lastName?: string;
};

// POST /auth/login
export const loginSchema = z
    .object({
        email: z.string().email(),
        password: z.string()
    })
    .required();

export type LoginBody = z.infer<typeof loginSchema>;

export type LoginResult = {
    success: boolean;
    error?: string;
};

// POST /auth/register
export const registerSchema = z
    .object({
        email: z.string().email(),
        password: z.string().min(8).max(200),
        firstName: z.string().min(2).max(100),
        lastName: z.string().min(2).max(100)
    })
    .required();

export type RegisterBody = z.infer<typeof registerSchema>;

export type RegisterResult = {
    success: boolean;
    error?: string;
};

// POST /auth/verify
export const verifySchema = z
    .object({
        token: z.string().length(64)
    })
    .required();

export type VerifyBody = z.infer<typeof verifySchema>;

export type VerifyResult = {
    success: boolean;
    error?: string;
};
