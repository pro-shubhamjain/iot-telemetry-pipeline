import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class TelemetryGateway {
  @WebSocketServer()
  server!: Server;

  broadcastTelemetry(data: unknown) {
    this.server.emit('telemetry', data);
  }

  broadcastStatus(robotId: string, data: unknown) {
    this.server.emit('status', { robotId, ...(data as object) });
  }
}