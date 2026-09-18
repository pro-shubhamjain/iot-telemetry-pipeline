# IoT Telemetry Pipeline

A working example of a fleet telemetry system that uses different protocols for different tasks:

- MQTT for communication between robots and the backend
- WebSocket for live telemetry updates
- REST for sending commands
- GraphQL for querying historical data
- gRPC for communication between internal services

## Data Flow

### Ingestion: Robot to Dashboard

Robot → MQTT publish → Mosquitto Broker → MQTT subscribe → Backend → WebSocket push → Browser Dashboard

### Commands: Dashboard to Robot

Browser Dashboard → REST POST → Backend → MQTT publish → Robot

### Historical Queries: Dashboard to Backend

Browser Dashboard → GraphQL query → Backend → Telemetry history

### Fleet Analytics: Backend to Analytics Service

Backend → gRPC call → Analytics Service → gRPC response → Dashboard through a GraphQL field

The analytics service calculates fleet statistics such as uptime, average battery drain, and health scores.

## Architecture

| Component | Role | Protocols |
|---|---|---|
| **Broker (Mosquitto)** | Routes publish and subscribe messages between robots and the backend. | MQTT |
| **Robot simulator** | Simulates robot firmware. Publishes telemetry at regular intervals, subscribes to command messages, and registers a Last Will and Testament (LWT) to report unexpected disconnections. | MQTT |
| **Backend (NestJS)** | Receives telemetry over MQTT, sends live updates through WebSocket, handles REST commands, serves GraphQL queries, and communicates with the analytics service over gRPC. | MQTT, WebSocket, REST, GraphQL, gRPC client |
| **Analytics service (NestJS)** | An internal service that calculates fleet-level statistics using telemetry data provided by the backend. It is not accessed directly by the browser. | gRPC server |
| **Dashboard** | A plain HTML, JavaScript, and CSS application. Displays live telemetry, sends commands, and queries historical data and fleet health. | WebSocket, REST, GraphQL |

## Why Each Protocol Is Used

### MQTT

MQTT is designed for lightweight, frequent communication between devices. It works well for robots that may have limited resources or unreliable network connections.

In this project, MQTT handles telemetry, commands, and robot status updates.

### WebSocket

The dashboard needs to receive telemetry updates as soon as they arrive. WebSocket provides a persistent connection that allows the backend to push updates to the browser without requiring the browser to poll repeatedly.

### REST

REST is used for simple commands, such as pausing a robot. The dashboard sends an HTTP request to the backend, and the backend publishes the corresponding command over MQTT.

### GraphQL

GraphQL is used to query historical telemetry and fleet health data. The dashboard can request only the fields and time range it needs, such as battery level and timestamps for a specific robot over the last 24 hours.

### gRPC

gRPC is used for internal communication between the backend and the analytics service. It provides a defined service contract and is suitable for service-to-service communication.

The analytics service is not exposed directly to the browser. Only the backend communicates with it.

## MQTT Concepts Demonstrated

- **Topics and wildcards:** `robot/+/telemetry` allows the backend to subscribe to telemetry from multiple robots.
- **QoS levels:** Telemetry uses QoS 0, while commands and status messages use QoS 1.
- **Retained messages:** The retained status topic allows new subscribers to receive the latest robot status immediately.
- **Last Will and Testament (LWT):** The broker publishes an `offline` status when a robot disconnects unexpectedly.

## Tooling Choices

- **Backend and analytics service: NestJS**  
  NestJS provides support for REST, GraphQL, gRPC, WebSocket, and MQTT. It helps keep the implementation organized while using multiple communication protocols.

- **Robot simulator: Plain Node.js**  
  The simulator is a lightweight standalone process, so it does not need the additional structure of NestJS.

- **Package manager: pnpm**  
  pnpm is used for package installation. The `backend/`, `analytics-service/`, and `robot-simulator/` directories are separate projects, not a pnpm workspace or monorepo.

## Project Structure

```text
iot-telemetry-pipeline/
├── docker-compose.yml
├── mosquitto/
│   └── config/mosquitto.conf
├── robot-simulator/
│   ├── package.json
│   └── index.js
├── analytics-service/                 # gRPC server
│   ├── proto/
│   │   └── analytics.proto
│   ├── package.json
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       └── analytics/
│           ├── analytics.controller.ts   # gRPC method handlers
│           └── analytics.service.ts      # Statistics calculation
├── backend/                            # Main application
│   ├── package.json
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── telemetry/                  # MQTT ingestion, WebSocket, and REST commands
│       │   ├── mqtt-bridge.service.ts
│       │   ├── telemetry.gateway.ts       # WebSocket gateway
│       │   ├── command.controller.ts      # REST controller
│       │   ├── telemetry-history.service.ts  # In-memory telemetry storage
│       │   └── telemetry.module.ts
│       ├── graphql/                    # Historical queries and fleet health
│       │   ├── telemetry.resolver.ts
│       │   ├── robot.type.ts
│       │   └── graphql.module.ts
│       └── analytics-client/           # gRPC client
│           ├── analytics-client.service.ts
│           └── analytics-client.module.ts
└── frontend/
    ├── index.html
    ├── app.js                          # WebSocket, REST, and GraphQL calls
    └── style.css
```

## Running the Project

### Prerequisites

Make sure you have the following installed:

- Docker Desktop
- Node.js 18 or later
- pnpm

Install pnpm if needed:

```powershell
npm install -g pnpm
```

### 1. Start the MQTT Broker

From the project root, run:

```powershell
docker compose up -d
docker ps
```

Confirm that the `mqtt-broker` container is running.

### 2. Test the Broker Using the MQTT CLI

This step is optional but useful for verifying that the broker is working.

**Terminal 1: Subscribe to robot messages**

```powershell
mosquitto_sub -h localhost -t "robot/#" -v
```

**Terminal 2: Publish a test message**

```powershell
mosquitto_pub -h localhost -t "robot/robot-01/telemetry" -m "{\"battery\":95}"
```

The message should appear in Terminal 1.

### 3. Start the Analytics Service

Open a new terminal:

```powershell
cd analytics-service
pnpm install
pnpm run start:dev
```

Look for a message similar to:

```text
Analytics gRPC service listening on 0.0.0.0:5001
```

### 4. Start the Backend

Open another terminal:

```powershell
cd backend
pnpm install
pnpm run start:dev
```

Check the logs to confirm that:

- The backend is connected to MQTT.
- The WebSocket gateway is running.
- The GraphQL endpoint is available.

The GraphQL endpoint is typically:

```text
http://localhost:3000/graphql
```

### 5. Start the Robot Simulator

Open another terminal:

```powershell
cd robot-simulator
pnpm install
pnpm start
```

The simulator should begin publishing telemetry and listening for commands.

### 6. Open the Dashboard

Open `frontend/index.html` in a browser.

The dashboard should display:

- Live telemetry through WebSocket
- Robot commands, such as **Pause**, through REST
- Historical telemetry through GraphQL

### 7. Test Each Protocol

- **REST:** Click the **Pause** button and confirm that the robot simulator receives the command.
- **WebSocket:** Watch the battery and temperature values update without refreshing the page.
- **GraphQL:** Open `http://localhost:3000/graphql` and run a query for historical telemetry or fleet health.
- **MQTT:** Use the MQTT CLI or robot simulator logs to verify telemetry and command messages.
- **gRPC:** Check the backend and analytics service logs to confirm that the backend can call the analytics service.

## Summary

This project demonstrates how multiple communication protocols can work together in a fleet telemetry system. Each protocol has a specific role, while the backend acts as the central connection between the robots, dashboard, and internal analytics service.