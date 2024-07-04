import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
    @Get()
    getHello(): { success: boolean } {
        return { success: true };
    }
}
