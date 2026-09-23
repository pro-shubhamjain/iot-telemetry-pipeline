import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class TelemetryGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  // Remember the last known status per robot, so a newly-connected browser
  // doesn't have to wait for the robot to publish again.
  private readonly latestStatus = new Map<string, unknown>();

  broadcastTelemetry(data: unknown) {
    this.server.emit('telemetry', data);
  }

  broadcastStatus(robotId: string, data: unknown) {
    const payload = { robotId, ...(data as object) };
    this.latestStatus.set(robotId, payload);
    this.server.emit('status', payload);
  }

  // Called automatically by Nest/Socket.io every time a NEW client connects.
  handleConnection(client: Socket) {
    for (const payload of this.latestStatus.values()) {
      client.emit('status', payload);
    }
  }
}