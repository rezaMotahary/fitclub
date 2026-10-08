import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): { name: string; docs: string } {
    return {
      name: 'FitClub API',
      docs: 'See /api/health and docs/handoff.md',
    };
  }
}
