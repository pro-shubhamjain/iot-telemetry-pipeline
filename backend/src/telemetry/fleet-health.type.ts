import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class FleetHealth {
  @Field()
  robotId!: string;

  @Field(() => Float)
  averageBatteryDrainPerReading!: number;

  @Field(() => Float)
  uptimePercentage!: number;

  @Field()
  healthScore!: string;
}