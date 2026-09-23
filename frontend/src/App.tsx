import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  Battery,
  Bot,
  Circle,
  MapPin,
  Pause,
  Play,
  Thermometer,
  Wifi,
  WifiOff,
  Clock3,
} from 'lucide-react';

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
  const [commandLoading, setCommandLoading] = useState(false);

  useEffect(() => {
    const socket: Socket = io(BACKEND_URL);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('telemetry', (data: Telemetry) => {
      setTelemetry(data);
    });

    socket.on('status', (data: RobotStatus) => {
      setStatus(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  async function sendCommand(action: 'pause' | 'resume') {
    try {
      setCommandLoading(true);

      await fetch(`${BACKEND_URL}/robots/${ROBOT_ID}/commands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
    } catch (error) {
      console.error('Failed to send command:', error);
    } finally {
      setCommandLoading(false);
    }
  }

  const isOnline = status?.status === 'online';
  const isPaused = telemetry?.paused ?? false;

  const battery = telemetry?.battery ?? 0;
  const temperature = telemetry?.temperature ?? 0;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.08),transparent_35%)]" />

      <main className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg">
              <Bot className="h-6 w-6 text-emerald-400" />
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold tracking-tight">
                  Robot Control
                </h1>

                <Badge
                  className={
                    isOnline
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10'
                      : 'border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/10'
                  }
                >
                  <Circle
                    className={`mr-1.5 h-2 w-2 fill-current ${
                      isOnline ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  />
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </Badge>
              </div>

              <p className="mt-1 text-sm text-zinc-500">
                Autonomous Unit · {ROBOT_ID}
              </p>
            </div>
          </div>

          {/* Connection */}
          <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2">
            {connected ? (
              <Wifi className="h-4 w-4 text-emerald-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-400" />
            )}

            <div>
              <p className="text-xs font-medium text-zinc-300">
                WebSocket
              </p>
              <p className="text-[11px] text-zinc-500">
                {connected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
          </div>
        </header>

        {/* Status banner */}
        <Card className="mb-6 border-zinc-800 bg-zinc-900/60 shadow-xl shadow-black/10">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  isPaused
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-emerald-500/10 text-emerald-400'
                }`}
              >
                {isPaused ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-zinc-200">
                  Robot state
                </p>
                <p className="text-xs text-zinc-500">
                  {isPaused
                    ? 'Robot is currently paused'
                    : 'Robot is operating normally'}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-xs text-zinc-500">Last telemetry</p>
              <p className="mt-1 text-sm font-medium text-zinc-300">
                {telemetry
                  ? new Date(telemetry.timestamp).toLocaleTimeString()
                  : 'Waiting for data...'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Battery */}
          <Card className="border-zinc-800 bg-zinc-900/60 transition-colors hover:border-zinc-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Battery
              </CardTitle>

              <Battery
                className={`h-5 w-5 ${
                  battery <= 20 ? 'text-red-400' : 'text-emerald-400'
                }`}
              />
            </CardHeader>

            <CardContent>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-semibold tracking-tight">
                  {telemetry ? `${battery}%` : '--'}
                </span>

                {telemetry && (
                  <span className="mb-1 text-xs text-zinc-500">
                    Power level
                  </span>
                )}
              </div>

              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all ${
                    battery <= 20 ? 'bg-red-500' : 'bg-emerald-500'
                  }`}
                  style={{
                    width: `${Math.max(0, Math.min(100, battery))}%`,
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Temperature */}
          <Card className="border-zinc-800 bg-zinc-900/60 transition-colors hover:border-zinc-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Temperature
              </CardTitle>

              <Thermometer className="h-5 w-5 text-orange-400" />
            </CardHeader>

            <CardContent>
              <span className="text-3xl font-semibold tracking-tight">
                {telemetry ? `${temperature}°C` : '--'}
              </span>

              <p className="mt-2 text-xs text-zinc-500">
                Internal temperature
              </p>
            </CardContent>
          </Card>

          {/* Position */}
          <Card className="border-zinc-800 bg-zinc-900/60 transition-colors hover:border-zinc-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Position
              </CardTitle>

              <MapPin className="h-5 w-5 text-blue-400" />
            </CardHeader>

            <CardContent>
              <div className="font-mono text-xl font-semibold">
                {telemetry ? (
                  <>
                    <span className="text-blue-400">X</span>{' '}
                    {telemetry.position.x}
                    <span className="mx-2 text-zinc-700">/</span>
                    <span className="text-blue-400">Y</span>{' '}
                    {telemetry.position.y}
                  </>
                ) : (
                  '--'
                )}
              </div>

              <p className="mt-2 text-xs text-zinc-500">
                Current coordinates
              </p>
            </CardContent>
          </Card>

          {/* Last update */}
          <Card className="border-zinc-800 bg-zinc-900/60 transition-colors hover:border-zinc-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Last Update
              </CardTitle>

              <Clock3 className="h-5 w-5 text-violet-400" />
            </CardHeader>

            <CardContent>
              <span className="text-xl font-semibold tracking-tight">
                {telemetry
                  ? new Date(telemetry.timestamp).toLocaleTimeString()
                  : '--'}
              </span>

              <p className="mt-2 text-xs text-zinc-500">
                Telemetry timestamp
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <section className="mt-6">
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Robot Controls
              </CardTitle>

              <p className="text-sm text-zinc-500">
                Send commands directly to {ROBOT_ID}
              </p>
            </CardHeader>

            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  disabled={commandLoading || !isOnline || isPaused}
                  onClick={() => sendCommand('pause')}
                  variant="outline"
                  className="h-11 border-zinc-700 bg-zinc-950 text-zinc-200 hover:bg-amber-500/10 hover:text-amber-400"
                >
                  <Pause className="mr-2 h-4 w-4" />
                  Pause Robot
                </Button>

                <Button
                  disabled={commandLoading || !isOnline || !isPaused}
                  onClick={() => sendCommand('resume')}
                  className="h-11 bg-emerald-600 text-white hover:bg-emerald-500"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Resume Robot
                </Button>
              </div>

              {!isOnline && (
                <p className="mt-3 text-xs text-red-400">
                  Controls are disabled while the robot is offline.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="mt-8 flex flex-col gap-2 border-t border-zinc-800 pt-5 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <span>Robot Monitoring System</span>
          <span>Backend: {BACKEND_URL}</span>
        </footer>
      </main>
    </div>
  );
}

export default App;