import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
class Position {
  @Field(() => Float)
  x!: number;

  @Field(() => Float)
  y!: number;
}

@ObjectType()
export class TelemetryReading {
  @Field()
  robotId!: string;

  @Field()
  timestamp!: string;

  @Field(() => Float)
  battery!: number;

  @Field(() => Float)
  temperature!: number;

  @Field(() => Position)
  position!: Position;

  @Field()
  paused!: boolean;
}