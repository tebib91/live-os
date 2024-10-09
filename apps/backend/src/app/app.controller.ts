import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('status')
  getStatus() {
    return {
      message: 'Backend is running',
      cpu: 45, // Mocked CPU usage
      ram: 70, // Mocked RAM usage
    };
  }
}
