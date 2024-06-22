import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
    constructor() {}

    @Get()
    getHello(): { success: boolean } {
        return { success: true };
    }
}
