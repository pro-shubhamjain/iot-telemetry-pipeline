import { Injectable, Logger } from '@nestjs/common';

export interface TelemetryPoint {
  battery: number;
  temperature: number;
  paused: boolean;
}

export interface FleetHealth {
  robotId: string;
  averageBatteryDrainPerReading: number;
  uptimePercentage: number;
  healthScore: string;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  // Running per-robot state, continuously updated as Kafka messages arrive.
  // This replaces "recompute everything from scratch on every request."
  private readonly recentReadings = new Map<string, TelemetryPoint[]>();
  private readonly latestHealth = new Map<string, FleetHealth>();
  private readonly MAX_WINDOW = 50;
 

  ingest(robotId: string, point: TelemetryPoint): void {
    const readings = this.recentReadings.get(robotId) ?? [];
    readings.push(point);
    if (readings.length > this.MAX_WINDOW) readings.shift();
    this.recentReadings.set(robotId, readings);

    const health = this.computeFleetHealth(robotId, readings);
    this.latestHealth.set(robotId, health);
  }

  // Called by the gRPC handler - just returns whatever the Kafka consumer
  // has already computed, instead of recomputing from a request payload.
  getLatestHealth(robotId: string): FleetHealth {
    return (
      this.latestHealth.get(robotId) ?? {
        robotId,
        averageBatteryDrainPerReading: 0,
        uptimePercentage: 0,
        healthScore: 'unknown',
      }
    );
  }

  private computeFleetHealth(robotId: string, readings: TelemetryPoint[]): FleetHealth {
    if (readings.length === 0) {
      return { robotId, averageBatteryDrainPerReading: 0, uptimePercentage: 0, healthScore: 'unknown' };
    }

    let totalDrain = 0;
    for (let i = 1; i < readings.length; i++) {
      const drain = readings[i - 1].battery - readings[i].battery;
      if (drain > 0) totalDrain += drain;
    }
    const averageBatteryDrainPerReading = readings.length > 1 ? totalDrain / (readings.length - 1) : 0;

    const activeCount = readings.filter((r) => !r.paused).length;
    const uptimePercentage = (activeCount / readings.length) * 100;

    const latestBattery = readings[readings.length - 1].battery;
    let healthScore: string;
    if (latestBattery < 15) healthScore = 'critical';
    else if (latestBattery < 40) healthScore = 'warning';
    else healthScore = 'good';

    return {
      robotId,
      averageBatteryDrainPerReading: Number(averageBatteryDrainPerReading.toFixed(3)),
      uptimePercentage: Number(uptimePercentage.toFixed(1)),
      healthScore,
    };
  }
}