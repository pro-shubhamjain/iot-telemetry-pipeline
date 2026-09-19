import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const BACKEND_URL = 'http://localhost:3000';
const ROBOT_ID = 'robot-01';

interface Telemetry {
  robotId: string;
  timestamp: string;
  battery: number;
  temperature: number;
  position: { x: number; y: number };
  paused: boolean;
}

interface RobotStatus {
  robotId: string;
  status: 'online' | 'offline';
  reason?: string;
}

function App() {
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [status, setStatus] = useState<RobotStatus | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket: Socket = io(BACKEND_URL);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('telemetry', (data: Telemetry) => setTelemetry(data));
    socket.on('status', (data: RobotStatus) => setStatus(data));

    // Clean up the connection when the component unmounts, so we don't
    // leak sockets on hot-reload or navigation.
    return () => {
      socket.disconnect();
    };
  }, []);

  async function sendCommand(action: 'pause' | 'resume') {
    await fetch(`${BACKEND_URL}/robots/${ROBOT_ID}/commands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
  }

  const isOnline = status?.status === 'online';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">🤖 Robot Fleet Dashboard</h1>
          <Badge variant={isOnline ? 'default' : 'destructive'}>
            {isOnline ? 'ONLINE' : status ? 'OFFLINE' : 'Connecting...'}
          </Badge>
        </div>

        <p className="text-sm text-zinc-400">
          WebSocket: {connected ? 'connected' : 'disconnected'} to {BACKEND_URL}
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-zinc-400">Battery</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">
              {telemetry ? `${telemetry.battery}%` : '--'}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-zinc-400">Temperature</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">
              {telemetry ? `${telemetry.temperature}°C` : '--'}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-zinc-400">Position</CardTitle>
            </CardHeader>
            <CardContent className="text-lg font-mono">
              {telemetry ? `x: ${telemetry.position.x}, y: ${telemetry.position.y}` : '--'}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-zinc-400">Last update</CardTitle>
            </CardHeader>
            <CardContent className="text-lg">
              {telemetry ? new Date(telemetry.timestamp).toLocaleTimeString() : '--'}
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3">
          <Button onClick={() => sendCommand('pause')} variant="secondary">
            ⏸ Pause
          </Button>
          <Button onClick={() => sendCommand('resume')} variant="secondary">
            ▶ Resume
          </Button>
        </div>
      </div>
    </div>
  );
}

export default App;