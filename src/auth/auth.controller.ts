import {
    Body,
    Controller,
    Get,
    HttpCode,
    Post,
    Req,
    UsePipes
} from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { randomBytes } from 'crypto';

import { PrismaService } from '../prisma.service';
import * as types from './auth.types';
import { ZodValidationPipe } from '../validation.pipe';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
    constructor(private readonly prisma: PrismaService) {}

    @Get('/user')
    @HttpCode(200)
    async getUser(@Req() request: Request): Promise<types.GetUserResult> {
        const token = request.cookies['token'];

        if (!token) {
            return {
                success: false,
                error: 'Not authenticated'
            };
        }

        const tokenObject = await this.prisma.token.findUnique({
            where: {
                token
            },
            include: {
                user: true
            }
        });

        if (!tokenObject) {
            return {
                success: false,
                error: 'Not authenticated'
            };
        }

        return {
            success: true,
            firstName: tokenObject.user.firstName,
            lastName: tokenObject.user.lastName
        };
    }

    @Post('/login')
    @HttpCode(200)
    @UsePipes(new ZodValidationPipe(types.loginSchema))
    async login(@Body() postData: types.LoginBody): Promise<types.LoginResult> {
        const user = await this.prisma.user.findUnique({
            where: {
                email: postData.email
            }
        });

        if (!user) {
            return {
                success: false,
                error: 'Invalid email or password.'
            };
        }

        const isValid = await compare(postData.password, user.passwordHash);

        if (!isValid) {
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
        @Body() postData: types.RegisterBody
    ): Promise<types.RegisterResult> {
        const existing = await this.prisma.user.findUnique({
            where: {
                email: postData.email
            }
        });

        if (existing) {
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
        // TODO: send email

        return {
            success: true
        };
    }

    @Post('/verify')
    @HttpCode(200)
    @UsePipes(new ZodValidationPipe(types.verifySchema))
    async verify(
        @Body() postData: types.VerifyBody
    ): Promise<types.VerifyResult> {
        const user = await this.prisma.user.findUnique({
            where: {
                verifyToken: postData.token
            }
        });

        if (!user) {
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

        return {
            success: true
        };
    }
}
