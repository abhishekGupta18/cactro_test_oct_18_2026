import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from './common/decorators/public.decorator';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

@Controller()
export class AppController {
  @Public()
  @ApiExcludeEndpoint()
  @Get()
  root(@Res() res: Response) {
    return res.redirect('/api/docs');
  }

  @Public()
  @Get('health')
  health() {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
