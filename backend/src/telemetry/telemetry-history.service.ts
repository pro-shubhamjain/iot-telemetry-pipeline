import { Injectable } from '@nestjs/common';

interface TelemetryRecord {
  robotId: string;
  timestamp: string;
  battery: number;
  temperature: number;
  position: { x: number; y: number };
  paused: boolean;
}

@Injectable()
export class TelemetryHistoryService {
  // In-memory only - lost on restart. The roadmap item to swap this for a
  // real time-series database (InfluxDB/TimescaleDB) replaces ONLY this
  // class; nothing else in the app needs to change, since everything else
  // talks to it through these two methods.
  private readonly history = new Map<string, TelemetryRecord[]>();
  private readonly MAX_RECORDS_PER_ROBOT = 100;

  record(data: TelemetryRecord): void {
    const existing = this.history.get(data.robotId) ?? [];
    existing.push(data);

    // Keep only the most recent N readings per robot, so memory doesn't grow forever.
    if (existing.length > this.MAX_RECORDS_PER_ROBOT) {
      existing.shift();
    }

    this.history.set(data.robotId, existing);
  }

  getHistory(robotId: string, limit = 20): TelemetryRecord[] {
    const records = this.history.get(robotId) ?? [];
    return records.slice(-limit);
  }

  getKnownRobotIds(): string[] {
    return Array.from(this.history.keys());
  }
}