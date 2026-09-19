import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';

interface TelemetryPoint {
  battery: number;
  temperature: number;
  paused: boolean;
}

interface FleetHealthResponse {
  robotId: string;
  averageBatteryDrainPerReading: number;
  uptimePercentage: number;
  healthScore: string;
}

interface AnalyticsServiceClient {
  getFleetHealth(data: { robotId: string; readings: TelemetryPoint[] }): Observable<FleetHealthResponse>;
}

@Injectable()
export class AnalyticsClientService implements OnModuleInit {
  private analyticsService!: AnalyticsServiceClient;

  constructor(@Inject('ANALYTICS_PACKAGE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.analyticsService = this.client.getService<AnalyticsServiceClient>('AnalyticsService');
  }

  async getFleetHealth(robotId: string, readings: TelemetryPoint[]): Promise<FleetHealthResponse> {
    return firstValueFrom(this.analyticsService.getFleetHealth({ robotId, readings }));
  }
}