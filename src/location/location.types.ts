import { z } from 'zod';

// POST /location/zip
export const zipSchema = z
    .object({
        lat: z.number().gt(-90).lt(90),
        long: z.number().gt(-180).lt(180)
    })
    .required();

export type ZipBody = z.infer<typeof zipSchema>;

// POST /location/check
export const checkSchema = z
    .object({
        zip: z.string().regex(/^[0-9]{5}$/)
    })
    .required();

export type CheckBody = z.infer<typeof checkSchema>;
