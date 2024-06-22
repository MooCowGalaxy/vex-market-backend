import {
    ArgumentMetadata,
    BadRequestException,
    PipeTransform
} from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
    constructor(private schema: ZodSchema) {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    transform(value: unknown, metadata: ArgumentMetadata) {
        try {
            return this.schema.parse(value);
        } catch (error) {
            throw new BadRequestException('Validation failed');
        }
    }
}
