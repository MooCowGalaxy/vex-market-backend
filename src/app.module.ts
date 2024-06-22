import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthController } from './auth/auth.controller';
import { PrismaService } from './prisma.service';

@Module({
    imports: [],
    controllers: [AppController, AuthController],
    providers: [PrismaService]
})
export class AppModule {}
