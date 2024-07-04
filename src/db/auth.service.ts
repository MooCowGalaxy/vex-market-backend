import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { User, ResetToken } from '@prisma/client';
import { compare, hash } from 'bcrypt';
import { randomBytes } from 'crypto';
import { sleep } from '../utils';

@Injectable()
export class AuthService {
    constructor(private prisma: PrismaService) {}

    // returns user with specified email or null if it doesn't exist
    findUserByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: {
                email
            }
        });
    }

    // deletes verify token and returns user with verify token or null if it doesn't exist
    async verifyUser(verifyToken: string): Promise<User | null> {
        let user = await this.prisma.user.findUnique({
            where: {
                verifyToken
            }
        });

        if (!user) return null;

        user = await this.prisma.user.update({
            where: {
                id: user.id
            },
            data: {
                verifyToken: null
            }
        });

        // TODO: send email notification

        return user;
    }

    // log in and create token, returns token string or null for invalid password
    async login(user: User, password: string): Promise<string | null> {
        const isValid = await compare(password, user.passwordHash);
        if (!isValid) return null;

        const token = randomBytes(64).toString('hex');

        await this.prisma.token.create({
            data: {
                token,
                userId: user.id
            }
        });

        return token;
    }

    // register user and returns user object, or null if email is taken
    async register(
        email: string,
        password: string,
        firstName: string,
        lastName: string
    ): Promise<User | null> {
        const existing = await this.findUserByEmail(email);
        if (existing) return null;

        const token = randomBytes(32).toString('hex');

        // TODO: send email async

        return this.prisma.user.create({
            data: {
                email: email,
                passwordHash: await hash(password, 9),
                firstName: firstName,
                lastName: lastName,
                joinTimestamp: Math.floor(Date.now() / 1000),
                verifyToken: token
            }
        });
    }

    // gets the user from email and sends a password reset email if it exists
    async sendPasswordReset(email: string) {
        const user = await this.findUserByEmail(email);

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
            await sleep(20);
        }
    }

    // gets token reset object or null if it doesn't exist
    async getPasswordReset(resetToken: string): Promise<ResetToken | null> {
        return this.prisma.resetToken.findUnique({
            where: {
                token: resetToken
            }
        });
    }

    // updates the password hash and sends an email, then deletes the reset token
    async resetPassword(token: ResetToken, newPassword: string) {
        await this.prisma.user.update({
            where: {
                id: token.userId
            },
            data: {
                passwordHash: await hash(newPassword, 9)
            }
        });

        await this.prisma.resetToken.delete({
            where: {
                id: token.id
            }
        });

        await this.prisma.token.deleteMany({
            where: {
                userId: token.userId
            }
        });

        // TODO: send email notification
        // TODO: disconnect all user sessions from WS
    }
}
