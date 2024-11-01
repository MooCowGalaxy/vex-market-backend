import {
    ArgumentMetadata,
    BadRequestException,
    PipeTransform
} from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
    constructor(private schema: ZodSchema) {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    transform(value: any, metadata: ArgumentMetadata) {
        try {
            return this.schema.parse(value);
        } catch (error) {
            throw new BadRequestException({
                success: false,
                error: 'Invalid post data.'
            });
        }
    }
}
