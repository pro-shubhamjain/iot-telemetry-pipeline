import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class TelemetryKafkaProducer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelemetryKafkaProducer.name);
  private kafka: Kafka;
  private producer!: Producer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'backend',
      brokers: ['localhost:9092'],
    });
  }

  async onModuleInit() {
    this.producer = this.kafka.producer();
    await this.producer.connect();
    this.logger.log('Connected to Kafka as producer');
  }

  async publishTelemetry(data: unknown) {
    await this.producer.send({
      topic: 'telemetry.raw',
      messages: [{ value: JSON.stringify(data) }],
    });
  }

  async onModuleDestroy() {
    await this.producer?.disconnect();
  }
}
