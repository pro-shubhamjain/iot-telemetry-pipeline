import { Injectable } from '@nestjs/common';

interface TelemetryPoint {
  battery: number;
  temperature: number;
  paused: boolean;
}

@Injectable()
export class AnalyticsService {
  computeFleetHealth(readings: TelemetryPoint[]) {
    if (readings.length === 0) {
      return {
        averageBatteryDrainPerReading: 0,
        uptimePercentage: 0,
        healthScore: 'unknown',
      };
    }

    // Battery drain: how much battery dropped, on average, between consecutive readings.
    let totalDrain = 0;
    for (let i = 1; i < readings.length; i++) {
      const drain = readings[i - 1].battery - readings[i].battery;
      if (drain > 0) totalDrain += drain;
    }
    const averageBatteryDrainPerReading =
      readings.length > 1 ? totalDrain / (readings.length - 1) : 0;

    // Uptime: percentage of readings where the robot was NOT paused.
    const activeCount = readings.filter((r) => !r.paused).length;
    const uptimePercentage = (activeCount / readings.length) * 100;

    // A simple, made-up health scoring rule - the kind of business logic
    // that's genuinely fine to keep this simple for a portfolio project.
    let healthScore: string;
    const latestBattery = readings[readings.length - 1].battery;
    if (latestBattery < 15) healthScore = 'critical';
    else if (latestBattery < 40) healthScore = 'warning';
    else healthScore = 'good';

    return {
      averageBatteryDrainPerReading: Number(averageBatteryDrainPerReading.toFixed(3)),
      uptimePercentage: Number(uptimePercentage.toFixed(1)),
      healthScore,
    };
  }
}