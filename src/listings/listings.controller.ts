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
    Put,
    Query,
    Res,
    UploadedFile,
    UseInterceptors,
    UsePipes
} from '@nestjs/common';
import { ListingsService } from './listings.service';
import { ZodValidationPipe } from '../validation.pipe';
import * as types from './listings.types';
import { AuthUser } from '../auth/auth.decorator';
import { User } from '@prisma/client';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';

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
            local: localListings.map((listing) =>
                this.listingsService.redactPost(listing)
            ),
            shipping: shippingListings.map((listing) =>
                this.listingsService.redactPost(listing)
            )
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
            Math.round(parseFloat(postData.price.toString()) * 100) / 100, // round to 2 decimals
            postData.type,
            postData.condition,
            geo
        );

        return {
            success: true,
            postId
        };
    }

    @Get('/self')
    async getSelfListings(@AuthUser() user: User, @Query('type') type: string) {
        let listingType = 'active';
        if (['active', 'archived'].includes(type)) listingType = type;

        const listings = await this.listingsService.getUserListings(
            user.id,
            listingType
        );

        return {
            success: true,
            listings: listings.map((listing) => {
                delete listing._geo;
                return listing;
            })
        };
    }

    @Get('/:postId')
    @HttpCode(200)
    async getListing(
        @Param('postId') postId: string,
        @Res({ passthrough: true }) response: Response
    ) {
        if (isNaN(parseInt(postId))) {
            response.status(404);
            return {
                success: false,
                error: 'Post not found'
            };
        }

        // get post object
        const post = await this.listingsService.getListing(parseInt(postId));
        if (post === null) {
            response.status(404);
            return {
                success: false,
                error: 'Post not found'
            };
        }

        return {
            success: true,
            ...this.listingsService.redactPost(post),
            authorId: post.authorId
        };
    }

    @Put('/:postId')
    @HttpCode(200)
    async updateListing(
        @AuthUser() user: User,
        @Param('postId') postId: string,
        @Body(new ZodValidationPipe(types.updateSchema))
        putData: types.UpdateBody,
        @Res({ passthrough: true }) response: Response
    ) {
        if (isNaN(parseInt(postId))) {
            response.status(404);
            return {
                success: false,
                error: 'Post not found'
            };
        }

        // get post object
        const post = await this.listingsService.getListing(parseInt(postId));
        if (post === null) {
            response.status(404);
            return {
                success: false,
                error: 'Post not found'
            };
        }

        if (post.authorId !== user.id) {
            response.status(403);
            return {
                success: false,
                error: 'Insufficient permissions'
            };
        }

        await this.listingsService.updateListing(post.id, putData);

        return {
            success: true
        };
    }

    @Post('/:postId/archive')
    @HttpCode(200)
    async archiveListing(
        @AuthUser() user: User,
        @Param('postId') postId: string,
        @Body(new ZodValidationPipe(types.archiveSchema))
        postData: types.ArchiveBody,
        @Res({ passthrough: true }) response: Response
    ) {
        if (isNaN(parseInt(postId))) {
            response.status(404);
            return {
                success: false,
                error: 'Post not found'
            };
        }

        // get post object
        const post = await this.listingsService.getListing(parseInt(postId));
        if (post === null) {
            response.status(404);
            return {
                success: false,
                error: 'Post not found'
            };
        }

        if (post.authorId !== user.id) {
            response.status(403);
            return {
                success: false,
                error: 'Insufficient permissions'
            };
        }

        await this.listingsService.archiveListing(post.id, postData.archived);

        return {
            success: true
        };
    }

    @Post('/:postId/images')
    @UseInterceptors(FileInterceptor('file'))
    @HttpCode(200)
    async uploadImage(
        @AuthUser() user: User,
        @Param('postId') postId: string,
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
        if (isNaN(parseInt(postId))) {
            response.status(404);
            return {
                success: false,
                error: 'Post not found'
            };
        }

        // get post object
        const post = await this.listingsService.getListing(parseInt(postId));
        if (post === null) {
            response.status(404);
            return {
                success: false,
                error: 'Post not found'
            };
        }

        if (post.authorId !== user.id) {
            response.status(403);
            return {
                success: false,
                error: 'Insufficient permissions'
            };
        }

        const res = await this.listingsService.uploadImage(user, post, file);
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
