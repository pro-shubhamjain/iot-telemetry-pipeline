import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AnalyticsService } from './analytics.service';

interface TelemetryPoint {
  battery: number;
  temperature: number;
  paused: boolean;
}

interface FleetHealthRequest {
  robotId: string;
  readings: TelemetryPoint[];
}

@Controller()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // 'AnalyticsService' and 'GetFleetHealth' here must match the .proto file EXACTLY.
  @GrpcMethod('AnalyticsService', 'GetFleetHealth')
  getFleetHealth(data: FleetHealthRequest) {
    const stats = this.analyticsService.computeFleetHealth(data.readings);
    return {
      robotId: data.robotId,
      ...stats,
    };
  }
}