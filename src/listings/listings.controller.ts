import {
    Body,
    Controller,
    Get,
    HttpCode,
    Post,
    Query,
    Res,
    UsePipes
} from '@nestjs/common';
import { ListingsService } from '../db/listings.service';
import { ZodValidationPipe } from '../validation.pipe';
import * as types from './listings.types';
import { AuthUser } from '../auth/auth.decorator';
import { User } from '@prisma/client';
import { Response } from 'express';

@Controller('listings')
export class ListingsController {
    constructor(private readonly listingsService: ListingsService) {}

    @Get()
    async getListings(
        @Query('zip') zip: string,
        @Query('miles') miles: string
    ) {
        const zipCode = parseInt(zip) || null;
        const milesNum = parseInt(miles) || null;

        const localListings = await this.listingsService.getLocalListings(
            zipCode,
            milesNum
        );
        const shippingListings =
            await this.listingsService.getShippingListings();

        return {
            success: true,
            localListings,
            shippingListings
        };
    }

    @Post()
    @HttpCode(200)
    async createListing(
        @AuthUser() user: User,
        @Body(new ZodValidationPipe(types.createSchema))
        postData: types.CreateBody,
        @Res({ passthrough: true }) response: Response
    ): Promise<types.CreateResult> {
        const geo = await this.listingsService.getLatLong(postData.zip);

        if (geo === null) {
            response.status(400);
            return {
                success: false,
                error: 'Invalid zip code.'
            };
        }

        const postId = await this.listingsService.createListing(
            user,
            postData.title,
            postData.description,
            postData.zip,
            postData.price,
            postData.type,
            postData.condition,
            geo
        );

        return {
            success: true,
            postId
        };
    }

    @Post('/search')
    @HttpCode(200)
    @UsePipes(new ZodValidationPipe(types.searchSchema))
    async searchListings(@Body() postData: types.SearchBody) {
        const zipCode = parseInt(postData.zipCode) || null;

        const listings = await this.listingsService.searchListings(
            postData.query,
            zipCode,
            postData.type
        );

        return {
            success: true,
            listings
        };
    }
}
