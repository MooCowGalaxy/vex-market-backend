import {
    Body,
    Controller,
    HttpCode,
    Post,
    Res,
    UsePipes
} from '@nestjs/common';
import { Response } from 'express';
import { ListingsService } from '../listings/listings.service';
import { ZodValidationPipe } from '../validation.pipe';
import * as types from './location.types';

@Controller('location')
export class LocationController {
    constructor(private readonly listingsService: ListingsService) {}

    @Post('/zip')
    @HttpCode(200)
    @UsePipes(new ZodValidationPipe(types.zipSchema))
    async getZipCode(
        @Body() postData: types.ZipBody,
        @Res({ passthrough: true }) response: Response
    ) {
        const zip = await this.listingsService.getZip(
            postData.lat,
            postData.long
        );

        if (zip === null) {
            response.status(400);
            return {
                success: false,
                error: `We couldn't find your local ZIP code.`
            };
        }

        return {
            success: true,
            zip: `00000${zip}`.slice(-5)
        };
    }

    @Post('/check')
    @HttpCode(200)
    @UsePipes(new ZodValidationPipe(types.checkSchema))
    async verifyZipCode(@Body() postData: types.CheckBody) {
        const geo = await this.listingsService.getLatLong(
            parseInt(postData.zip)
        );

        return {
            success: true,
            result: geo !== null
        };
    }
}
