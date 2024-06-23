import { Controller, Get, HttpCode } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InjectMeiliSearch } from 'nestjs-meilisearch';
import { MeiliSearch } from 'meilisearch';

@Controller('listings')
export class ListingsController {
    constructor(
        private readonly prisma: PrismaService,
        @InjectMeiliSearch() private readonly meiliSearch: MeiliSearch
    ) {}

    @Get()
    @HttpCode(200)
    async getListings() {
        //
    }
}
