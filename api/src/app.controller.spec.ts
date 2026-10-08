import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return FitSteel API info', () => {
      expect(appController.getHello()).toEqual({
        name: 'FitSteel API',
        docs: 'See /api/health and docs/handoff.md',
      });
    });
  });
});
