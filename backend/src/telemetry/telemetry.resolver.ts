import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { TelemetryHistoryService } from './telemetry-history.service';
import { TelemetryReading } from './telemetry.type';
import { AnalyticsClientService } from './analytics-client.service';
import { FleetHealth } from './fleet-health.type';

@Resolver()
export class TelemetryResolver {
  constructor(
    private readonly history: TelemetryHistoryService,
    private readonly analyticsClient: AnalyticsClientService,
  ) {}

  @Query(() => [TelemetryReading])
  telemetryHistory(
    @Args('robotId') robotId: string,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ): TelemetryReading[] {
    return this.history.getHistory(robotId, limit);
  }

  @Query(() => [String])
  knownRobots(): string[] {
    return this.history.getKnownRobotIds();
  }

  // This is the field that internally triggers a gRPC call - the browser
  // just sees a normal GraphQL field, never knows gRPC is involved.
  @Query(() => FleetHealth)
  async fleetHealth(@Args('robotId') robotId: string): Promise<FleetHealth> {
    const readings = this.history.getHistory(robotId, 50);
    return this.analyticsClient.getFleetHealth(robotId, readings);
  }
}