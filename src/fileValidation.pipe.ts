import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class FileSizeValidationPipe implements PipeTransform {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    transform(value: any, metadata: ArgumentMetadata) {
        // "value" is an object containing the file's attributes and metadata
        const maxFileSize = 5 * 1000 * 1000; // 5 MB
        return value.size < maxFileSize;
    }
}
