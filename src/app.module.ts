import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthController } from './auth/auth.controller';
import { PrismaService } from './db/prisma.service';
import { AuthService } from './db/auth.service';
import { ListingsController } from './listings/listings.controller';
import { MeiliSearchModule } from 'nestjs-meilisearch';
import { PrismaMiddleware } from './db/prisma.middleware';
import { ListingsService } from './db/listings.service';
import { LocationController } from './location/location.controller';

@Module({
    imports: [
        MeiliSearchModule.forRootAsync({
            useFactory: () => ({
                host: process.env.MEILISEARCH_URL || 'http://localhost:7700',
                apiKey: process.env.MEILISEARCH_KEY || 'no key provided'
            })
        })
    ],
    controllers: [AppController, AuthController, ListingsController, LocationController],
    providers: [PrismaService, AuthService, ListingsService]
})
export class AppModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(PrismaMiddleware).forRoutes('*');
    }
}
