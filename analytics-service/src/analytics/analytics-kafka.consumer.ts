import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import { AnalyticsService } from './analytics.service';

@Injectable()
export class AnalyticsKafkaConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsKafkaConsumer.name);
  private kafka!: Kafka;
  private consumer!: Consumer;

  constructor(private readonly analyticsService: AnalyticsService) {}

  onModuleInit() {
    this.kafka = new Kafka({ clientId: 'analytics-service', brokers: ['localhost:9092'] });
    return this.start();
  }

  private async start() {
    this.consumer = this.kafka.consumer({ groupId: 'analytics-group' });
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'telemetry.raw', fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const data = JSON.parse(message.value!.toString());
        this.analyticsService.ingest(data.robotId, {
          battery: data.battery,
          temperature: data.temperature,
          paused: data.paused,
        });
      },
    });

    this.logger.log('Consuming from Kafka topic telemetry.raw');
  }

  async onModuleDestroy() {
    await this.consumer?.disconnect();
  }
}