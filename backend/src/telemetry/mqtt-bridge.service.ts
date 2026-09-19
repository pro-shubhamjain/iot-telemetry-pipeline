import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { TelemetryGateway } from './telemetry.gateway';
import { TelemetryHistoryService } from './telemetry-history.service';

@Injectable()
export class MqttBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttBridgeService.name);
  private client!: mqtt.MqttClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly gateway: TelemetryGateway,
    private readonly history: TelemetryHistoryService,
  ) {}

  onModuleInit() {
    const brokerUrl = this.configService.get<string>('BROKER_URL', 'mqtt://localhost:1883');
    this.client = mqtt.connect(brokerUrl, { clientId: 'backend-bridge' });

    this.client.on('connect', () => {
      this.logger.log(`Connected to MQTT broker at ${brokerUrl}`);
      this.client.subscribe('robot/+/telemetry', { qos: 0 });
      this.client.subscribe('robot/+/status', { qos: 1 });
    });

    this.client.on('message', (topic, payload) => {
      const parts = topic.split('/');
      const robotId = parts[1];
      const kind = parts[2];

      let data: any;
      try {
        data = JSON.parse(payload.toString());
      } catch {
        this.logger.warn(`Ignoring non-JSON message on ${topic}`);
        return;
      }

      if (kind === 'telemetry') {
        this.gateway.broadcastTelemetry(data);
        this.history.record(data); // <-- new: store every reading as it arrives
      } else if (kind === 'status') {
        this.gateway.broadcastStatus(robotId, data);
      }
    });

    this.client.on('error', (err) => this.logger.error(`MQTT error: ${err.message}`));
  }

  publishCommand(robotId: string, command: Record<string, unknown>) {
    const topic = `robot/${robotId}/commands`;
    this.client.publish(topic, JSON.stringify(command), { qos: 1 });
    this.logger.log(`Published command to ${topic}: ${JSON.stringify(command)}`);
  }

  onModuleDestroy() {
    this.client?.end();
  }
}
