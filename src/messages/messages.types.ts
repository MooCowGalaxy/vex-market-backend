import { z } from 'zod';
import { User } from '@prisma/client';

export type ClientData = {
    user: User | null;
};

export const wsAuthSchema = z
    .object({
        token: z.string().length(64)
    })
    .required();

export type WSAuthData = z.infer<typeof wsAuthSchema>;

export const wsListenSchema = z
    .object({
        chatId: z.number()
    })
    .required();

export type WSListenData = z.infer<typeof wsListenSchema>;

export const createChatSchema = z
    .object({
        postId: z.number(),
        initialMessage: z.string().min(1).max(2000)
    })
    .required();

export type CreateChatBody = z.infer<typeof createChatSchema>;

export const sendMessageSchema = z
    .object({
        message: z.string().min(1).max(2000)
    })
    .required();

export type SendMessageBody = z.infer<typeof sendMessageSchema>;
