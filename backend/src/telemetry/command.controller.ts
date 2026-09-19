import { Body, Controller, Param, Post } from '@nestjs/common';
import { MqttBridgeService } from './mqtt-bridge.service';

@Controller('robots')
export class CommandController {
  constructor(private readonly mqttBridge: MqttBridgeService) {}

  // POST /robots/robot-01/commands   body: { "action": "pause" }
  @Post(':id/commands')
  sendCommand(@Param('id') id: string, @Body() command: Record<string, unknown>) {
    this.mqttBridge.publishCommand(id, command);
    return { sent: true, robotId: id, command };
  }
}