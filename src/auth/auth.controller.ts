import {
    Body,
    Controller,
    Get,
    HttpCode,
    Param,
    Post,
    Res,
    UsePipes
} from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { randomBytes } from 'crypto';

import { PrismaService } from '../prisma.service';
import * as types from './auth.types';
import { Result } from '../types';
import { ZodValidationPipe } from '../validation.pipe';
import { Response } from 'express';
import { sleep } from '../utils';
import { AuthUser } from './auth.decorator';
import { User } from '@prisma/client';

@Controller('auth')
export class AuthController {
    constructor(private readonly prisma: PrismaService) {}

    @Get('/user')
    @HttpCode(200)
    async getUser(@AuthUser() user: User): Promise<types.GetUserResult> {
        return {
            success: true,
            firstName: user.firstName,
            lastName: user.lastName
        };
    }

    @Post('/login')
    @HttpCode(200)
    @UsePipes(new ZodValidationPipe(types.loginSchema))
    async login(
        @Body() postData: types.LoginBody,
        @Res() response: Response
    ): Promise<Result> {
        const user = await this.prisma.user.findUnique({
            where: {
                email: postData.email
            }
        });

        if (!user) {
            response.status(401);
            return {
                success: false,
                error: 'Invalid email or password.'
            };
        }

        const isValid = await compare(postData.password, user.passwordHash);

        if (!isValid) {
            response.status(401);
            return {
                success: false,
                error: 'Invalid email or password.'
            };
        }

        const token = randomBytes(64).toString('hex');

        await this.prisma.token.create({
            data: {
                token,
                userId: user.id
            }
        });

        return {
            success: true
        };
    }

    @Post('/register')
    @HttpCode(200)
    @UsePipes(new ZodValidationPipe(types.registerSchema))
    async register(
        @Body() postData: types.RegisterBody,
        @Res() response: Response
    ): Promise<Result> {
        const existing = await this.prisma.user.findUnique({
            where: {
                email: postData.email
            }
        });

        if (existing) {
            response.status(400);
            return {
                success: false,
                error: 'A user already exists with that email.'
            };
        }

        const token = randomBytes(32).toString('hex');

        await this.prisma.user.create({
            data: {
                email: postData.email,
                passwordHash: await hash(postData.password, 9),
                firstName: postData.firstName,
                lastName: postData.lastName,
                joinTimestamp: Math.floor(Date.now() / 1000),
                verifyToken: token
            }
        });
        // TODO: send email async

        return {
            success: true
        };
    }

    @Post('/verify')
    @HttpCode(200)
    @UsePipes(new ZodValidationPipe(types.verifySchema))
    async verify(
        @Body() postData: types.VerifyBody,
        @Res() response: Response
    ): Promise<Result> {
        const user = await this.prisma.user.findUnique({
            where: {
                verifyToken: postData.token
            }
        });

        if (!user) {
            response.status(401);
            return {
                success: false,
                error: 'Invalid verification token.'
            };
        }

        await this.prisma.user.update({
            where: {
                id: user.id
            },
            data: {
                verifyToken: null
            }
        });

        // TODO: send email notification

        return {
            success: true
        };
    }

    @Post('/reset')
    @HttpCode(200)
    @UsePipes(new ZodValidationPipe(types.resetPasswordSchema))
    async resetPassword(
        @Body() postData: types.ResetPasswordBody
    ): Promise<Result> {
        const user = await this.prisma.user.findUnique({
            where: {
                email: postData.email
            }
        });

        if (user) {
            const token = randomBytes(32).toString('hex');

            await this.prisma.resetToken.create({
                data: {
                    token,
                    expires: Math.floor(Date.now() / 1000) + 60 * 30, // 30 minutes
                    userId: user.id
                }
            });

            // TODO: send mail async
        } else {
            // timing attack
            await sleep(100);
        }

        return {
            success: true
        };
    }

    @Get('/reset/:token')
    @HttpCode(200)
    async checkResetToken(
        @Param('token') resetToken: string,
        @Res() response: Response
    ): Promise<Result> {
        const token = await this.prisma.resetToken.findUnique({
            where: {
                token: resetToken
            }
        });

        // if token doesn't exist or if token is expired
        if (!token || token.expires < Math.floor(Date.now() / 1000)) {
            response.status(404);
            return {
                success: false,
                error: 'Invalid password reset token.'
            };
        }

        return {
            success: true
        };
    }

    @Post('/reset/:token')
    @HttpCode(200)
    @UsePipes(new ZodValidationPipe(types.useResetTokenSchema))
    async useResetToken(
        @Param('token') resetToken: string,
        @Body() postData: types.UseResetTokenBody,
        @Res() response: Response
    ): Promise<Result> {
        const token = await this.prisma.resetToken.findUnique({
            where: {
                token: resetToken
            }
        });

        // if token doesn't exist or if token is expired
        if (!token || token.expires < Math.floor(Date.now() / 1000)) {
            response.status(404);
            return {
                success: false,
                error: 'Invalid password reset token.'
            };
        }

        await this.prisma.user.update({
            where: {
                id: token.userId
            },
            data: {
                passwordHash: await hash(postData.password, 9)
            }
        });

        // TODO: send email notification

        return {
            success: true
        };
    }
}
