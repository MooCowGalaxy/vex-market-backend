import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthController } from './auth/auth.controller';
import { PrismaService } from './prisma.service';
import { ListingsController } from './listings/listings.controller';
import { MeiliSearchModule } from 'nestjs-meilisearch';
import { PrismaMiddleware } from './prisma.middleware';

@Module({
    imports: [
        MeiliSearchModule.forRootAsync({
            useFactory: () => ({
                host: process.env.MEILISEARCH_URL || 'http://localhost:7700',
                apiKey: process.env.MEILISEARCH_KEY || 'no key provided'
            })
        })
    ],
    controllers: [AppController, AuthController, ListingsController],
    providers: [PrismaService]
})
export class AppModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(PrismaMiddleware).forRoutes('*');
    }
}
