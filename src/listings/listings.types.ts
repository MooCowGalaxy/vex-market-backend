import { z } from 'zod';
import { Result } from '../types';
import { Post } from '@prisma/client';

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

export const updateSchema = z
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

export type UpdateBody = z.infer<typeof updateSchema>;

export const archiveSchema = z
    .object({
        archived: z.boolean()
    })
    .required();

export type ArchiveBody = z.infer<typeof archiveSchema>;

export const searchSchema = z
    .object({
        query: z.string(),
        zipCode: z.string().optional(),
        type: z.enum(['local', 'shipping', 'both']).default('both')
        // TODO: category
    })
    .required();

export type SearchBody = z.infer<typeof searchSchema>;

export type LatLong = {
    lat: number;
    lng: number;
};

export type ZipDocument = {
    id: number;
    city: string;
    county: string;
    state: string;
    _geo: {
        lat: number;
        lng: number;
    };
};

export type PostDocument = {
    id: number;
    title: string;
    description: string;
    zip: number;
    zipFriendly: string | null;
    price: number;
    type: 'local' | 'shipping' | 'both';
    condition: string;
    images: string[];
    _geo?: {
        lat: number;
        lng: number;
    };
    created: number;
    lastUpdated: number;
    archived: boolean;
};

export type CombinedPost = Post & PostDocument;

export type RedactedPost = {
    id: number;
    title: string;
    description: string;
    zipFriendly: string;
    price: number;
    type: 'local' | 'shipping' | 'both';
    condition: string;
    images: string[];
    created: number;
    lastUpdated: number;
};
