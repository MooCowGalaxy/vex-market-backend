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

import { AuthService } from './auth.service';
import * as types from './auth.types';
import { Result } from '../types';
import { ZodValidationPipe } from '../validation.pipe';
import { Response } from 'express';
import { AuthUser } from './auth.decorator';
import { User } from '@prisma/client';
import { MessagesService } from '../messages/messages.service';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly messagesService: MessagesService
    ) {}

    @Get('/user')
    async getUser(@AuthUser() user: User): Promise<types.GetUserResult> {
        const notifications =
            await this.messagesService.getTotalUnreadCount(user);

        return {
            success: true,
            userId: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            notifications
        };
    }

    @Get('/user/notifications')
    async getNotificationCount(@AuthUser() user: User) {
        const notifications =
            await this.messagesService.getTotalUnreadCount(user);

        return {
            success: true,
            notifications
        };
    }

    @Post('/login')
    @HttpCode(200)
    @UsePipes(new ZodValidationPipe(types.loginSchema))
    async login(
        @Body() postData: types.LoginBody,
        @Res({ passthrough: true }) response: Response
    ): Promise<Result> {
        const user = await this.authService.findUserByEmail(postData.email);

        if (!user) {
            response.status(401);
            return {
                success: false,
                error: 'Invalid email or password.'
            };
        }

        const token = await this.authService.login(user, postData.password);

        if (!token) {
            response.status(401);
            return {
                success: false,
                error: 'Invalid email or password.'
            };
        }

        if (user.verifyToken !== null) {
            response.status(401);
            return {
                success: false,
                error: 'You must verify your email first before logging in.'
            };
        }

        response.cookie('token', token);

        return {
            success: true
        };
    }

    @Post('/register')
    @HttpCode(200)
    @UsePipes(new ZodValidationPipe(types.registerSchema))
    async register(
        @Body() postData: types.RegisterBody,
        @Res({ passthrough: true }) response: Response
    ): Promise<Result> {
        const user = await this.authService.register(
            postData.email,
            postData.password,
            postData.firstName,
            postData.lastName
        );

        if (!user) {
            response.status(400);
            return {
                success: false,
                error: 'A user already exists with that email.'
            };
        }

        return {
            success: true
        };
    }

    @Post('/verify')
    @HttpCode(200)
    @UsePipes(new ZodValidationPipe(types.verifySchema))
    async verify(
        @Body() postData: types.VerifyBody,
        @Res({ passthrough: true }) response: Response
    ): Promise<Result> {
        const user = await this.authService.verifyUser(postData.token);

        if (!user) {
            response.status(401);
            return {
                success: false,
                error: 'Invalid verification token.'
            };
        }

        return {
            success: true
        };
    }

    @Post('/password')
    @HttpCode(200)
    async updatePassword(
        @AuthUser() user: User,
        @Body(new ZodValidationPipe(types.updatePasswordSchema))
        postData: types.UpdatePasswordBody
    ): Promise<Result> {
        await this.authService.updatePassword(user.id, postData.password);

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
        await this.authService.sendPasswordReset(postData.email);

        return {
            success: true
        };
    }

    @Get('/reset/:token')
    async checkResetToken(
        @Param('token') resetToken: string,
        @Res({ passthrough: true }) response: Response
    ): Promise<Result> {
        const token = await this.authService.getPasswordReset(resetToken);

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
    async useResetToken(
        @Param('token') resetToken: string,
        @Body(new ZodValidationPipe(types.useResetTokenSchema))
        postData: types.UseResetTokenBody,
        @Res({ passthrough: true }) response: Response
    ): Promise<Result> {
        const token = await this.authService.getPasswordReset(resetToken);

        // if token doesn't exist or if token is expired
        if (!token || token.expires < Math.floor(Date.now() / 1000)) {
            response.status(404);
            return {
                success: false,
                error: 'Invalid password reset token.'
            };
        }

        await this.authService.resetPassword(token, postData.password);

        return {
            success: true
        };
    }

    @Post('/logout')
    @HttpCode(200)
    async logout(
        @Res({ passthrough: true }) response: Response
    ): Promise<Result> {
        response.cookie('token', null);

        return {
            success: true
        };
    }
}
