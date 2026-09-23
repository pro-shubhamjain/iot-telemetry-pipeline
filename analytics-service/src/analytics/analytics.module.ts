import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsKafkaConsumer } from './analytics-kafka.consumer';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsKafkaConsumer],
})
export class AnalyticsModule {}