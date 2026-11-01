import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { AuthService } from './auth/auth.service.js';
import { productionConfigProblems } from './common/production-config.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configProblems = productionConfigProblems(process.env);
  if (configProblems.length > 0) {
    for (const problem of configProblems) {
      console.error(`[startup] ${problem}`);
    }
    await app.close();
    process.exit(1);
  }

  // Behind nginx or another proxy, set TRUST_PROXY=1 so rate limits see the visitor's real IP.
  const trustProxy = process.env.TRUST_PROXY?.trim();
  if (trustProxy) {
    app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);
  }

  app.setGlobalPrefix('api');
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  app.enableCors({
    origin: webOrigin,
    credentials: true,
  });

  if (process.env.NODE_ENV === 'production') {
    const weakStaff = await app.get(AuthService).findStaffUsingSamplePasswords();
    if (weakStaff.length > 0) {
      console.error(
        `[startup] Staff accounts still use a sample password: ${weakStaff.join(', ')}. Set real passwords with "npm run staff:set".`,
      );
      await app.close();
      process.exit(1);
    }
  }

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`FitClub API listening on http://localhost:${port}/api`);
}
await bootstrap();
