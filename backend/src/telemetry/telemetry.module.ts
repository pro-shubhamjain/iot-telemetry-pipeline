import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { MqttBridgeService } from './mqtt-bridge.service';
import { TelemetryGateway } from './telemetry.gateway';
import { CommandController } from './command.controller';
import { TelemetryHistoryService } from './telemetry-history.service';
import { TelemetryResolver } from './telemetry.resolver';
import { AnalyticsClientService } from './analytics-client.service';
import { TelemetryKafkaProducer } from './telemetry-kafka.producer';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'ANALYTICS_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'analytics',
          protoPath: join(__dirname, '../proto/analytics.proto'),
          url: 'localhost:5001',
        },
      },
    ]),
  ],
  controllers: [CommandController],
  providers: [
    MqttBridgeService,
    TelemetryGateway,
    TelemetryHistoryService,
    TelemetryResolver,
    AnalyticsClientService,
    TelemetryKafkaProducer,
  ],
})
export class TelemetryModule {}