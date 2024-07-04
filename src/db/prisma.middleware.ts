import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from './prisma.service'; // Adjust the path as necessary

@Injectable()
export class PrismaMiddleware implements NestMiddleware {
    constructor(private readonly prisma: PrismaService) {}

    use(req: Request, res: Response, next: NextFunction) {
        // @ts-expect-error TS7053
        req['prisma'] = this.prisma;
        next();
    }
}
