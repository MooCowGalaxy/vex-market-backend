import { z } from 'zod';
import { Result } from '../types';

export const createSchema = z
    .object({
        title: z.string().min(1).max(128),
        description: z.string().min(1).max(8000),
        price: z.number().gt(0).lt(10000),
        zip: z.number().int().min(0).max(99999),
        condition: z.enum([
            'New',
            'Like new',
            'Good',
            'Used',
            'Poor',
            'Parts only',
            'N/A'
        ]),
        type: z.enum(['local', 'shipping', 'both']).default('both')
    })
    .required();

export type CreateBody = z.infer<typeof createSchema>;

export type CreateResult = Result & {
    postId?: number;
};

export const searchSchema = z
    .object({
        query: z.string(),
        zipCode: z.string().optional(),
        type: z.enum(['local', 'shipping', 'both']).default('both')
        // TODO: category
    })
    .required();

export type SearchBody = z.infer<typeof searchSchema>;
