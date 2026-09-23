import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AnalyticsService } from './analytics.service';
import type { FleetHealth } from './analytics.service';

interface FleetHealthRequest {
  robotId: string;
}

@Controller()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @GrpcMethod('AnalyticsService', 'GetFleetHealth')
  getFleetHealth(data: FleetHealthRequest): FleetHealth {
    return this.analyticsService.getLatestHealth(data.robotId);
  }
}