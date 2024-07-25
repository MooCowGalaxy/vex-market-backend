import { config } from 'dotenv';
config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import type { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        rawBody: true
    });

    app.useBodyParser('json', { limit: '10kb' });
    app.use(cookieParser());
    app.getHttpAdapter().getInstance().disable('x-powered-by');
    app.enableCors({
        origin: [
            process.env.MODE === 'prod'
                ? 'https://vexmarket.com'
                : 'http://localhost:5173'
        ],
        credentials: true
    });

    await app.listen(process.env.PORT ? parseInt(process.env.PORT) : 3000);
}

bootstrap().then();
