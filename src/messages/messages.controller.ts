import {
    Body,
    Controller,
    FileTypeValidator,
    Get,
    HttpCode,
    MaxFileSizeValidator,
    Param,
    ParseFilePipe,
    Post,
    Query,
    Res,
    UploadedFile,
    UseInterceptors
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { AuthUser } from '../auth/auth.decorator';
import { User } from '@prisma/client';
import { ListingsService } from '../listings/listings.service';
import { PostDocument } from '../listings/listings.types';
import * as types from './messages.types';
import { Response } from 'express';
import { ZodValidationPipe } from '../validation.pipe';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('messages')
export class MessagesController {
    constructor(
        private readonly messagesService: MessagesService,
        private readonly listingsService: ListingsService
    ) {}

    @Post('token')
    @HttpCode(200)
    async getWebSocketToken(@AuthUser() user: User) {
        return {
            success: true,
            token: await this.messagesService.createLoginToken(user)
        };
    }

    @Get()
    async getChats(@AuthUser() user: User) {
        const chats = await this.messagesService.getChats(user);

        // remove duplicate post IDs
        const postIds: { [key: string]: number } = {};

        chats.forEach((chat) => {
            if (chat.postId !== null) {
                postIds[chat.postId] = chat.postId;
            }
        });

        const posts = await this.listingsService.getListingsFromId(
            Object.values(postIds)
        );

        const postDict: { [key: string]: PostDocument } = {};
        for (const post of posts) {
            postDict[post.id.toString()] = post;
        }

        return {
            success: true,
            chats: chats.map((chat) => ({
                id: chat.id,
                postName: chat.postId ? postDict[chat.postId].title : null,
                postArchived: chat.postId
                    ? postDict[chat.postId].archived
                    : null,
                recipientName: this.messagesService.getChatRecipient(
                    chat,
                    user
                ),
                lastUpdate: chat.lastUpdate,
                unreadCount:
                    chat.sellerId === user.id
                        ? chat.sellerUnread
                        : chat.buyerUnread
            }))
        };
    }

    @Post()
    @HttpCode(200)
    async createChat(
        @AuthUser() user: User,
        @Body(new ZodValidationPipe(types.createChatSchema))
        postData: types.CreateChatBody,
        @Res({ passthrough: true }) response: Response
    ) {
        const post = await this.listingsService.getListing(postData.postId);
        if (post === null) {
            response.status(404);
            return {
                success: false,
                error: 'Post not found'
            };
        }

        const chat = await this.messagesService.findOrCreateChat(user, post);
        await this.messagesService.createMessage(
            post,
            chat,
            user,
            postData.initialMessage
        );

        return {
            success: true,
            chatId: chat.id
        };
    }

    @Post(':chatId/read')
    @HttpCode(200)
    async setUnreadChatMessages(
        @AuthUser() user: User,
        @Param('chatId') chatId: string,
        @Res({ passthrough: true }) response: Response
    ) {
        if (isNaN(parseInt(chatId))) {
            response.status(404);
            return {
                success: false,
                error: 'Chat not found'
            };
        }

        // get chat
        const chat = await this.messagesService.findChat(
            user,
            parseInt(chatId)
        );
        if (!chat) {
            response.status(404);
            return {
                success: false,
                error: 'Chat not found'
            };
        }

        await this.messagesService.setUnreadCount(chat, user, 0);

        return {
            success: true
        };
    }

    @Get(':chatId')
    async getChatMessages(
        @AuthUser() user: User,
        @Param('chatId') chatId: string,
        @Query('before') beforeId: string,
        @Res({ passthrough: true }) response: Response
    ) {
        if (isNaN(parseInt(chatId))) {
            response.status(404);
            return {
                success: false,
                error: 'Chat not found'
            };
        }

        const before = parseInt(beforeId) || null;

        // get chat
        const chat = await this.messagesService.findChat(
            user,
            parseInt(chatId)
        );
        if (!chat) {
            response.status(404);
            return {
                success: false,
                error: 'Chat not found'
            };
        }

        const messages = await this.messagesService.getMessages(
            chat,
            25,
            before
        );

        await this.messagesService.setUnreadCount(chat, user, 0);

        let post = null;
        if (chat.postId) {
            post = await this.listingsService.getListing(chat.postId);
        }

        return {
            success: true,
            postName: post ? post.title : null,
            postArchived: post ? post.archived : null,
            postId: post ? post.id : null,
            recipientName: this.messagesService.getChatRecipient(chat, user),
            messages: messages.map((message) => ({
                id: message.id,
                authorId: message.authorId,
                timestamp: parseInt(message.timestamp.toString()),
                message: message.message,
                image: message.image
            }))
        };
    }

    @Post(':chatId')
    @HttpCode(200)
    async sendChatMessage(
        @AuthUser() user: User,
        @Param('chatId') chatId: string,
        @Body(new ZodValidationPipe(types.sendMessageSchema))
        postData: types.SendMessageBody,
        @Res({ passthrough: true }) response: Response
    ) {
        if (isNaN(parseInt(chatId))) {
            response.status(404);
            return {
                success: false,
                error: 'Chat not found'
            };
        }

        // get chat
        const chat = await this.messagesService.findChat(
            user,
            parseInt(chatId)
        );
        if (!chat || !chat.postId) {
            response.status(404);
            return {
                success: false,
                error: 'Chat not found'
            };
        }

        const post = await this.listingsService.getListing(chat.postId);
        if (!post) {
            response.status(500);
            return {
                success: false,
                error: 'Something went wrong while sending the message.'
            };
        }

        await this.messagesService.createMessage(
            post,
            chat,
            user,
            postData.message
        );

        return {
            success: true
        };
    }

    @Post(':chatId/image')
    @UseInterceptors(FileInterceptor('file'))
    @HttpCode(200)
    async uploadImageToChat(
        @AuthUser() user: User,
        @Param('chatId') chatId: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 5 * 1000 * 1000 }),
                    new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' })
                ]
            })
        )
        file: Express.Multer.File,
        @Res({ passthrough: true }) response: Response
    ) {
        if (isNaN(parseInt(chatId))) {
            response.status(404);
            return {
                success: false,
                error: 'Chat not found'
            };
        }

        // get chat
        const chat = await this.messagesService.findChat(
            user,
            parseInt(chatId)
        );
        if (!chat || !chat.postId) {
            response.status(404);
            return {
                success: false,
                error: 'Chat not found'
            };
        }

        const post = await this.listingsService.getListing(chat.postId);
        if (!post) {
            response.status(500);
            return {
                success: false,
                error: `Something went wrong while sending the message.`
            };
        }

        if (chat.sellerId !== user.id || chat.buyerId !== user.id) {
            response.status(403);
            return {
                success: false,
                error: `Insufficient permissions to send image: Your user ID: ${user.id}, allowed user IDs: [${chat.sellerId}, ${chat.buyerId}]`
            };
        }

        const res = await this.messagesService.uploadImage(
            post,
            chat,
            user,
            file
        );
        if (!res) {
            response.status(500);
            return {
                success: false,
                error: 'Something went wrong while uploading your image'
            };
        }

        return {
            success: true
        };
    }
}
