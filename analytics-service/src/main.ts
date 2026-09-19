import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'analytics',
      protoPath: join(__dirname, 'proto/analytics.proto'),
      url: '0.0.0.0:5001',
    },
  });

  await app.listen();
  console.log('Analytics gRPC service listening on 0.0.0.0:5001');
}
bootstrap();