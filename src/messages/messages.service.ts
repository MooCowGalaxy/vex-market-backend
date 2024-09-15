import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { Cron } from '@nestjs/schedule';
import { Chat, Post, Prisma, User } from '@prisma/client';
import { randomBytes } from 'crypto';
import { MessagesGateway } from './messages.gateway';
import { CdnService } from '../db/cdn.service';
import { CombinedPost } from '../listings/listings.types';

@Injectable()
export class MessagesService {
    constructor(
        private prisma: PrismaService,
        private readonly cdnService: CdnService,
        @Inject(forwardRef(() => MessagesGateway))
        private readonly messagesGateway: MessagesGateway
    ) {}

    // login token -> user id and expiration time in unix ms
    loginTokens: { [key: string]: { expiration: number; userId: number } } = {};

    // free memory every 5 min
    @Cron('*/5 * * * *')
    purgeLoginTokens() {
        for (const [token, { expiration }] of Object.entries(
            this.loginTokens
        )) {
            if (Date.now() > expiration) {
                delete this.loginTokens[token];
            }
        }
    }

    async createLoginToken(user: User) {
        const token = randomBytes(32).toString('hex');

        this.loginTokens[token] = {
            expiration: Date.now() + 60 * 1000, // 1 minute
            userId: user.id
        };

        return token;
    }

    async consumeLoginToken(token: string) {
        const data = this.loginTokens[token];
        if (!data || Date.now() > data.expiration) return null;

        const user = await this.prisma.user.findUnique({
            where: {
                id: data.userId
            }
        });
        if (!user) return null;

        const chats = await this.getChats(user);

        delete this.loginTokens[token];

        return {
            chats: chats.map((chat) => chat.id),
            user: user
        };
    }

    async getChats(user: User) {
        return this.prisma.chat.findMany({
            where: {
                OR: [{ sellerId: user.id }, { buyerId: user.id }]
            },
            include: {
                buyer: true,
                seller: true
            }
        });
    }

    async getTotalUnreadCount(user: User) {
        const chats = await this.getChats(user);

        let sum = 0;
        for (const chat of chats) {
            sum +=
                chat.sellerId === user.id
                    ? chat.sellerUnread
                    : chat.buyerUnread;
        }

        return sum;
    }

    async findChat(user: User, chatId: number) {
        const chat = await this.prisma.chat.findUnique({
            where: {
                id: chatId
            },
            include: {
                seller: true,
                buyer: true
            }
        });
        if (!chat) return null;
        if (chat.sellerId !== user.id && chat.buyerId !== user.id) return null;

        return chat;
    }

    async findOrCreateChat(user: User, post: Post) {
        const chat = await this.prisma.chat.findFirst({
            where: {
                buyerId: user.id,
                postId: post.id
            }
        });

        if (chat) return chat;

        return this.prisma.chat.create({
            data: {
                postId: post.id,
                sellerId: post.authorId,
                buyerId: user.id,
                lastUpdate: Math.floor(Date.now() / 1000)
            }
        });
    }

    getChatRecipient(chat: Chat & { seller?: any; buyer?: any }, user: User) {
        let recipient;
        if (chat.sellerId === user.id) {
            recipient = chat.buyer;
        } else if (chat.buyerId === user.id) {
            recipient = chat.seller;
        } else return null;

        return `${recipient.firstName} ${recipient.lastName.slice(0, 1)}${recipient.lastName.length > 1 ? '.' : ''}`;
    }

    async getMessages(
        chat: Chat,
        limit: number = 25,
        before: number | null = null
    ) {
        const where: Prisma.ChatMessageWhereInput = {
            chatId: chat.id
        };
        if (before) where.id = { lt: before };

        return this.prisma.chatMessage.findMany({
            where,
            take: limit,
            orderBy: {
                timestamp: 'desc'
            }
        });
    }

    async setUnreadCount(
        chat: Chat,
        user: User,
        unreadCount: number,
        opposite: boolean = false
    ) {
        const buyer = chat.buyerId === user.id;
        const seller = chat.sellerId === user.id;

        if ((opposite && buyer) || (!opposite && seller)) {
            // update seller
            await this.prisma.chat.update({
                where: {
                    id: chat.id
                },
                data: {
                    sellerUnread: unreadCount
                }
            });
        } else if ((!opposite && buyer) || (opposite && seller)) {
            // update buyer
            await this.prisma.chat.update({
                where: {
                    id: chat.id
                },
                data: {
                    buyerUnread: unreadCount
                }
            });
        }
    }

    async incrementUnreadCountOpposite(chat: Chat, user: User) {
        // increment for the opposite user, e.g. if user is buyer then increment seller
        if (chat.sellerId === user.id) {
            await this.setUnreadCount(chat, user, chat.buyerUnread + 1, true);
        } else if (chat.buyerId === user.id) {
            await this.setUnreadCount(chat, user, chat.sellerUnread + 1, true);
        }
    }

    async createMessage(
        post: CombinedPost,
        chat: Chat,
        sender: User,
        message: string
    ) {
        const chatMessage = await this.prisma.chatMessage.create({
            data: {
                chatId: chat.id,
                authorId: sender.id,
                message,
                timestamp: Date.now()
            }
        });

        await this.prisma.chat.update({
            where: {
                id: chat.id
            },
            data: {
                lastUpdate: Math.floor(Date.now() / 1000)
            }
        });

        await this.setUnreadCount(chat, sender, 0);
        await this.incrementUnreadCountOpposite(chat, sender);

        this.messagesGateway.broadcastMessage({
            ...chatMessage,
            chatTitle: post.title,
            timestamp: parseInt(chatMessage.timestamp.toString()),
            authorName: `${sender.firstName} ${sender.lastName[0]}.`
        });
    }

    async uploadImage(
        post: CombinedPost,
        chat: Chat,
        sender: User,
        file: Express.Multer.File
    ) {
        const fileName = `messages/${chat.cdnId}/${Date.now()}.${file.originalname.split('.').slice(-1)[0]}`;

        let res;
        try {
            res = await this.cdnService.uploadFile(fileName, file.buffer);
        } catch (e) {
            console.error(e);
            return false;
        }

        const chatMessage = await this.prisma.chatMessage.create({
            data: {
                chatId: chat.id,
                authorId: sender.id,
                message: '',
                image: res.url,
                timestamp: Date.now()
            }
        });

        await this.prisma.chat.update({
            where: {
                id: chat.id
            },
            data: {
                lastUpdate: Math.floor(Date.now() / 1000)
            }
        });

        await this.setUnreadCount(chat, sender, 0);
        await this.incrementUnreadCountOpposite(chat, sender);

        this.messagesGateway.broadcastMessage({
            ...chatMessage,
            chatTitle: post.title,
            timestamp: parseInt(chatMessage.timestamp.toString()),
            authorName: `${sender.firstName} ${sender.lastName[0]}.`
        });

        return true;
    }
}
