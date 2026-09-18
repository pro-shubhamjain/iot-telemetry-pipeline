import mqtt from 'mqtt';

const BROKER_URL = 'mqtt://localhost:1883';
const ROBOT_ID = 'robot-01';

const TOPIC_TELEMETRY = `robot/${ROBOT_ID}/telemetry`;
const TOPIC_STATUS = `robot/${ROBOT_ID}/status`;
const TOPIC_COMMANDS = `robot/${ROBOT_ID}/commands`;

interface Telemetry {
  robotId: string;
  timestamp: string;
  battery: number;
  temperature: number;
  position: { x: number; y: number };
  paused: boolean;
}

interface RobotStatus {
  status: 'online' | 'offline';
  reason?: 'shutdown' | 'unexpected-disconnect';
}

interface RobotCommand {
  action: 'pause' | 'resume';
}

// Simulated robot state - these variables drift over time to mimic real sensor readings.
let battery = 100;
let temperature = 32;
let position = { x: 0, y: 0 };
let paused = false;

const client = mqtt.connect(BROKER_URL, {
  clientId: `${ROBOT_ID}-firmware`,
  will: {
    topic: TOPIC_STATUS,
    payload: JSON.stringify({ status: 'offline', reason: 'unexpected-disconnect' } satisfies RobotStatus),
    qos: 1,
    retain: true,
  },
});

client.on('connect', () => {
  console.log(`[${ROBOT_ID}] connected to broker at ${BROKER_URL}`);

  // Announce we're online. retain: true means any dashboard that connects
  // LATER still immediately sees this, instead of waiting for the next message.
  client.publish(
    TOPIC_STATUS,
    JSON.stringify({ status: 'online' } satisfies RobotStatus),
    { qos: 1, retain: true },
  );

  // Listen for commands sent FROM the dashboard TO this robot.
  client.subscribe(TOPIC_COMMANDS, { qos: 1 }, (err) => {
    if (err) console.error(`[${ROBOT_ID}] failed to subscribe to commands:`, err.message);
    else console.log(`[${ROBOT_ID}] listening for commands on ${TOPIC_COMMANDS}`);
  });

  startTelemetryLoop();
});

client.on('message', (topic: string, payload: Buffer) => {
  if (topic !== TOPIC_COMMANDS) return;

  try {
    const command = JSON.parse(payload.toString()) as RobotCommand;
    console.log(`[${ROBOT_ID}] received command:`, command);

    if (command.action === 'pause') paused = true;
    if (command.action === 'resume') paused = false;
  } catch {
    console.warn(`[${ROBOT_ID}] received non-JSON command, ignoring`);
  }
});

function startTelemetryLoop(): void {
  setInterval(() => {
    if (!paused) {
      battery = Math.max(0, battery - Math.random() * 0.5);
      temperature = 30 + Math.random() * 10;
      position.x += (Math.random() - 0.5) * 2;
      position.y += (Math.random() - 0.5) * 2;
    }

    const telemetry: Telemetry = {
      robotId: ROBOT_ID,
      timestamp: new Date().toISOString(),
      battery: Number(battery.toFixed(1)),
      temperature: Number(temperature.toFixed(1)),
      position: { x: Number(position.x.toFixed(2)), y: Number(position.y.toFixed(2)) },
      paused,
    };

    // QoS 0 = "fire and forget" - right choice for frequent, low-stakes sensor data.
    client.publish(TOPIC_TELEMETRY, JSON.stringify(telemetry), { qos: 0 });
    console.log(`[${ROBOT_ID}] published telemetry:`, telemetry);
  }, 2000);
}

// Graceful shutdown: if you stop this script yourself (Ctrl+C), publish
// "offline" ourselves. This is different from the LWT - the LWT only fires
// on an UNEXPECTED disconnect (crash, network drop). This handles the
// expected case, so the dashboard can tell the two apart if it wants to.
process.on('SIGINT', () => {
  console.log(`[${ROBOT_ID}] shutting down gracefully...`);
  client.publish(
    TOPIC_STATUS,
    JSON.stringify({ status: 'offline', reason: 'shutdown' } satisfies RobotStatus),
    { qos: 1, retain: true },
    () => {
      client.end(false, {}, () => process.exit(0));
    },
  );
});