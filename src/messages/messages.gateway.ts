import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    WsException
} from '@nestjs/websockets';
import { MessagesService } from './messages.service';
import { Server, Socket } from 'socket.io';
import {
    ClientData,
    WSAuthData,
    wsAuthSchema,
    WSListenData,
    wsListenSchema
} from './messages.types';
import { forwardRef, Inject } from '@nestjs/common';

@WebSocketGateway(3001, {
    cors: {
        origin: '*'
    }
})
export class MessagesGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
    constructor(
        @Inject(forwardRef(() => MessagesService))
        private readonly messagesService: MessagesService
    ) {}

    @WebSocketServer()
    server: Server;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    afterInit(server: Server) {
        console.log(`Server initialized`);
    }

    handleConnection(client: Socket, ...args: any[]) {
        console.log(`Client connected: ${client.id} ${args}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('auth')
    async handleEvent(client: Socket, data: any) {
        // data validation
        let parsedData: WSAuthData;
        try {
            parsedData = wsAuthSchema.parse(data);
        } catch (e) {
            throw new WsException('Invalid message data');
        }

        if (!client.data) client.data = {} as ClientData;

        const chatData = await this.messagesService.consumeLoginToken(
            parsedData.token
        );
        if (chatData === null) {
            throw new WsException('Invalid authentication token');
        }
        client.join(chatData.chats.map((chatId) => `chat:${chatId}`));
        client.emit('auth');
        client.data.user = chatData.user;
    }

    @SubscribeMessage('listen')
    async addListener(client: Socket, data: any) {
        // data validation
        let parsedData: WSListenData;
        try {
            parsedData = wsListenSchema.parse(data);
        } catch (e) {
            throw new WsException('Invalid message data');
        }

        // auth
        if (!client.data) client.data = {} as ClientData;
        if (!client.data.user) {
            throw new WsException('Authentication required');
        }

        const chat = await this.messagesService.findChat(
            client.data.user,
            parsedData.chatId
        );
        if (!chat) {
            throw new WsException('No chat found');
        }

        client.join(`chat:${chat.id}`);
    }

    broadcastMessage({
        id,
        chatId,
        chatTitle,
        timestamp,
        authorId,
        authorName,
        message = '',
        image = null
    }: {
        id: number;
        chatId: number;
        chatTitle: string;
        timestamp: number;
        authorId: number;
        authorName: string;
        message: string;
        image: string | null;
    }) {
        this.server.to(`chat:${chatId}`).emit('chat', {
            chatId,
            chatTitle,
            id,
            timestamp,
            authorId,
            authorName,
            message,
            image
        });
    }
}
