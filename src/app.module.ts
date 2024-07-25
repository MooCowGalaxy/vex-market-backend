import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthController } from './auth/auth.controller';
import { PrismaService } from './db/prisma.service';
import { AuthService } from './auth/auth.service';
import { ListingsController } from './listings/listings.controller';
import { MeiliSearchModule } from 'nestjs-meilisearch';
import { PrismaMiddleware } from './db/prisma.middleware';
import { ListingsService } from './listings/listings.service';
import { LocationController } from './location/location.controller';
import { CdnService } from './db/cdn.service';
import { MessagesController } from './messages/messages.controller';
import { MessagesGateway } from './messages/messages.gateway';
import { MessagesService } from './messages/messages.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
    imports: [
        MeiliSearchModule.forRootAsync({
            useFactory: () => ({
                host: process.env.MEILISEARCH_URL || 'http://localhost:7700',
                apiKey: process.env.MEILISEARCH_KEY || 'no key provided'
            })
        }),
        ScheduleModule.forRoot()
    ],
    controllers: [
        AppController,
        AuthController,
        ListingsController,
        LocationController,
        MessagesController
    ],
    providers: [
        PrismaService,
        AuthService,
        ListingsService,
        CdnService,
        MessagesService,
        MessagesGateway
    ]
})
export class AppModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(PrismaMiddleware).forRoutes('*');
    }
}
