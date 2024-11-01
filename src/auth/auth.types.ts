import { z } from 'zod';
import { Result } from '../types';

export function passwordReq(password: string) {
    return (
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password)
    );
}

// GET /auth/user
export type GetUserResult = Result & {
    userId?: number;
    firstName?: string;
    lastName?: string;
    email?: string;
    notifications?: number;
};

// POST /auth/login
export const loginSchema = z
    .object({
        email: z.string().email(),
        password: z.string()
    })
    .required();

export type LoginBody = z.infer<typeof loginSchema>;

// POST /auth/register
export const registerSchema = z
    .object({
        email: z.string().email(),
        password: z.string().min(8).max(200).refine(passwordReq),
        firstName: z.string().min(2).max(100),
        lastName: z.string().min(2).max(100)
    })
    .required();

export type RegisterBody = z.infer<typeof registerSchema>;

// POST /auth/verify
export const verifySchema = z
    .object({
        token: z.string().length(64)
    })
    .required();

export type VerifyBody = z.infer<typeof verifySchema>;

// POST /auth/update
export const updatePasswordSchema = z
    .object({
        password: z.string().min(8).max(200).refine(passwordReq)
    })
    .required();

export type UpdatePasswordBody = z.infer<typeof updatePasswordSchema>;

// POST /auth/reset
export const resetPasswordSchema = z
    .object({
        email: z.string().email()
    })
    .required();

export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>;

// POST /auth/reset/:token
export const useResetTokenSchema = z
    .object({
        password: z.string().min(8).max(200).refine(passwordReq)
    })
    .required();

export type UseResetTokenBody = z.infer<typeof useResetTokenSchema>;
