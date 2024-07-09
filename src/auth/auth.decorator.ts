import {
    createParamDecorator,
    ExecutionContext,
    UnauthorizedException
} from '@nestjs/common';
import { User } from '@prisma/client';

export const AuthUser = createParamDecorator(
    async (data: any, ctx: ExecutionContext): Promise<User> => {
        const request = ctx.switchToHttp().getRequest();
        const response = ctx.switchToHttp().getResponse();
        const prisma = request['prisma'];

        const token = request.cookies['token'];

        if (!token) {
            response.status(401).json({
                success: false,
                error: 'Not authenticated'
            });
            throw new UnauthorizedException('Not authenticated');
        }

        const tokenObject = await prisma.token.findUnique({
            where: { token },
            include: { user: true }
        });

        if (!tokenObject) {
            response.status(401).json({
                success: false,
                error: 'Not authenticated'
            });
            throw new UnauthorizedException('Not authenticated');
        }

        return tokenObject.user;
    }
);
