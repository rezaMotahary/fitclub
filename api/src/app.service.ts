import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): { name: string; docs: string } {
    return {
      name: 'FitSteel API',
      docs: 'See /api/health and docs/handoff.md',
    };
  }
}
