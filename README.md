# iot-telemetry-pipeline

A fleet-telemetry system that deliberately uses a different protocol for each job it's actually good at: MQTT for device ingestion, WebSocket for live push, REST for simple commands, GraphQL for flexible historical queries, gRPC for internal service-to-service calls, and Kafka for durable, replayable event streaming between backend services.

## Data flow

**Ingestion (robot -> dashboard):**
Robot(s) -> MQTT publish -> Mosquitto Broker -> MQTT subscribe -> Backend -> WebSocket push -> Browser Dashboard

**Commands (dashboard -> robot):**
Browser Dashboard -> REST POST -> Backend -> MQTT publish -> Robot(s)

**Historical queries (dashboard -> backend):**
Browser Dashboard -> GraphQL query -> Backend (reads in-memory telemetry history)

**Event streaming (backend -> analytics service, continuous):**
Backend -> produces every telemetry reading to Kafka topic `telemetry.raw` -> Analytics Service consumes independently and maintains a continuously-updated fleet-health value per robot in memory. This runs constantly, whether or not anyone is looking at the dashboard.

**Fleet analytics (dashboard -> backend -> internal service, on-demand):**
Browser Dashboard -> GraphQL query (`fleetHealth`) -> Backend -> gRPC call to Analytics Service ("what's your current fleet health for this robot?") -> Analytics Service returns its already-computed value instantly (no recomputation) -> back through GraphQL -> Dashboard

## Architecture

| Component | Role | Protocol(s) |
|---|---|---|
| **Mosquitto** | Routes pub/sub messages between robots and backend. | MQTT |
| **Kafka** | Durable, replayable event log for telemetry. Decouples "data arrived" from "data gets processed" -- the backend doesn't need to know who's consuming, and consumers can be added later without touching the producer. | Kafka |
| **Robot simulator** | Stands in for real robot firmware -- publishes telemetry on an interval, subscribes to commands, registers a Last Will and Testament so the broker can announce it going offline unexpectedly. | MQTT |
| **Backend (NestJS)** | Ingests MQTT, pushes live data over WebSocket, accepts REST commands, serves GraphQL queries, produces telemetry events to Kafka, and asks the analytics service for its current fleet-health value over gRPC. | MQTT, WebSocket, REST, GraphQL, gRPC (client), Kafka (producer) |
| **Analytics service (NestJS)** | Internal-only. Continuously consumes the Kafka telemetry stream and maintains an always-up-to-date fleet-health value per robot in memory; serves that value on-demand over gRPC. Never touched by the browser directly. | gRPC (server), Kafka (consumer) |
| **Frontend (React + shadcn/ui)** | Vite + React dashboard. WebSocket for live data, REST for commands, GraphQL for history/fleet-health queries. Never touches MQTT, gRPC, or Kafka -- those stay internal. | WebSocket, REST, GraphQL (client) |

### Why each protocol is where it is
- **MQTT** -- the right choice for many small, frequent, possibly-unreliable device connections. Not replaceable by REST/GraphQL here.
- **WebSocket** -- the browser needs a live *push*, not something it polls for.
- **REST** -- a command is a single fire-and-forget action; REST's simplicity fits, and the browser can't call gRPC directly at all.
- **GraphQL** -- historical queries need flexible field/range selection, which is exactly what GraphQL is for.
- **gRPC** -- a lightweight, synchronous "what's the current value?" request between two known services, with a fixed strict contract -- the textbook gRPC use case. Notably, the gRPC request here carries almost no payload (just a robot ID) -- all the heavy lifting already happened asynchronously via Kafka.
- **Kafka** -- sits at a different layer than gRPC: gRPC is synchronous request/response between two known services; Kafka is asynchronous, durable, and supports multiple independent consumers reading the same stream without the producer knowing or caring who they are. Fleet health here is computed continuously in the background from the Kafka stream -- gRPC just retrieves whatever's already been computed, rather than recalculating it on every call. This project uses **both** deliberately, to demonstrate the distinction rather than picking one and using it everywhere.

### On persistence (deliberately not included)
All state (telemetry history, fleet health) is kept **in memory** -- a `Map`/array inside each service, lost on restart. This is intentional: the project's focus is protocol choices, not data storage, and adding a database wouldn't teach anything new about MQTT/WebSocket/REST/GraphQL/gRPC/Kafka. In a real production system, both `TelemetryHistoryService` (backend) and `AnalyticsService` (analytics-service) would be backed by a real time-series database (see Roadmap) -- the tradeoff being accepted here is explicit, not accidental.

### Key MQTT concepts this project demonstrates
- **Topics & wildcards** -- `robot/+/telemetry` scales to any number of robots.
- **QoS levels** -- telemetry QoS 0 (fire-and-forget), commands/status QoS 1 (at-least-once).
- **Retained messages** -- `status` topic retained, so late-joining dashboards see current state immediately.
- **Last Will and Testament (LWT)** -- broker auto-publishes "offline" if a robot disconnects ungracefully.

### Key Kafka concepts this project demonstrates
- **Topics as durable logs** -- `telemetry.raw` retains messages so a consumer that starts late (or restarts) can catch up, unlike MQTT's fire-and-forget QoS 0 telemetry.
- **Decoupled, stateful consumers** -- analytics-service consumes independently of the backend producing, and maintains its own running state from the stream rather than being told what to compute on each request.
- **Consumer groups** -- analytics-service joins Kafka as `analytics-group`; a second instance with the same group ID would split partitions for load-balancing, while a different group ID would let it see the full stream independently.
- **KRaft mode** -- this project runs Kafka without a separate Zookeeper container, using Kafka's newer built-in metadata quorum.

## Tooling choices

- **Monorepo: pnpm workspace + Turborepo** -- `backend`, `analytics-service`, `robot-simulator`, and `frontend` are all workspace packages under one `pnpm-workspace.yaml`. `turbo run dev` runs every service's `dev` script in parallel from one command (the frontend is typically run in its own terminal alongside it for cleaner log output, but is fully wired into the same workspace and `turbo.json`).
- **Backend & analytics-service: NestJS** -- first-class support for REST, GraphQL, gRPC, WebSocket, MQTT, and Kafka all in one framework, which is why it's the right choice once combining this many protocols.
- **Robot simulator: plain Node.js + TypeScript** -- a lightweight standalone process, not a service, so it doesn't need Nest's structure. Run via `ts-node`.
- **Frontend: React (Vite) + shadcn/ui + Tailwind** -- component-driven UI, chosen once the dashboard needed to juggle WebSocket + REST + GraphQL state together in one interface.
- **Package manager: pnpm** -- workspace-native, fast installs, shared content-addressable store.

## Project structure

```
iot-telemetry-pipeline/
├── pnpm-workspace.yaml
├── turbo.json
├── docker-compose.yml          # Mosquitto + Kafka
├── mosquitto/
│   └── config/mosquitto.conf
├── robot-simulator/
│   ├── package.json
│   └── index.ts
├── analytics-service/                 # gRPC server + Kafka consumer
│   ├── src/proto/analytics.proto
│   ├── package.json
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       └── analytics/
│           ├── analytics.controller.ts        # @GrpcMethod handler
│           ├── analytics.service.ts           # running fleet-health state
│           └── analytics-kafka.consumer.ts    # Kafka consumer, feeds the state
├── backend/                            # speaks every protocol
│   ├── src/proto/analytics.proto
│   ├── package.json
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── telemetry/
│       │   ├── mqtt-bridge.service.ts
│       │   ├── telemetry.gateway.ts          # WebSocket
│       │   ├── command.controller.ts         # REST
│       │   ├── telemetry-history.service.ts
│       │   ├── telemetry.resolver.ts         # GraphQL
│       │   ├── telemetry.type.ts
│       │   ├── fleet-health.type.ts
│       │   ├── analytics-client.service.ts   # gRPC client
│       │   ├── telemetry-kafka.producer.ts   # Kafka producer
│       │   └── telemetry.module.ts
└── frontend/                           # React + Vite + shadcn/ui
    ├── src/
    │   ├── App.tsx
    │   ├── index.css
    │   ├── components/ui/       # shadcn components (card, button, badge)
    │   └── lib/utils.ts
    ├── vite.config.ts
    └── components.json
```

## Running it from scratch

**Prerequisites:** Docker Desktop, Node.js 18+, pnpm (`npm install -g pnpm`).

### 1. Install everything from the workspace root
```powershell
cd D:\GithubRepos\iot-telemetry-pipeline
pnpm install
```

### 2. Start Mosquitto + Kafka
```powershell
docker compose up -d
docker ps
```
Confirm both `mqtt-broker` and `kafka-broker` show `Up`.

### 3. (Optional) Sanity-check each broker with the CLI
MQTT:
```powershell
mosquitto_sub -h localhost -t "robot/#" -v
mosquitto_pub -h localhost -t "robot/robot-01/telemetry" -m '{"battery":95}'
```
Kafka:
```powershell
docker exec -it kafka-broker /opt/kafka/bin/kafka-console-consumer.sh --topic telemetry.raw --bootstrap-server localhost:9092
docker exec -it kafka-broker /opt/kafka/bin/kafka-console-producer.sh --topic telemetry.raw --bootstrap-server localhost:9092
```

### 4. Start the backend services together
```powershell
pnpm turbo run dev
```
This starts `backend`, `robot-simulator`, and `analytics-service` in parallel with prefixed logs.

### 5. Start the frontend (separately, for cleaner logs)
```powershell
cd frontend
pnpm dev
```
Open the URL Vite prints (typically `http://localhost:5173`).

### 6. Test each protocol
- **MQTT:** robot simulator logs show telemetry publishing every 2s.
- **WebSocket:** dashboard cards update live without refreshing.
- **REST:** click **Pause** on the dashboard -- robot simulator logs the received command.
- **GraphQL:** query `telemetryHistory` or `fleetHealth` at `http://localhost:3000/graphql`.
- **gRPC:** the `fleetHealth` GraphQL field triggers a lightweight backend -> analytics-service call internally -- check analytics-service's logs to see it's returning a value it already computed, not recalculating.
- **Kafka:** analytics-service's logs should show it consuming telemetry continuously, completely independent of whether the `fleetHealth` query is ever called.

### 7. Test failure detection (the LWT)
```powershell
Get-Process node
Stop-Process -Id <PID> -Force
```
Dashboard should flip to "OFFLINE" within a couple of seconds.

## Roadmap / possible extensions
- Replace in-memory state with a real time-series store (InfluxDB/TimescaleDB) in both `TelemetryHistoryService` and `AnalyticsService`, so data survives restarts and multiple instances can share state
- Add a second, independent Kafka consumer (e.g. a persistence-service) to prove the "add consumers without touching the producer" property
- Multiple simulated robots running concurrently
- Broker authentication (MQTT `password_file`, Kafka SASL) instead of anonymous/plaintext access
- TLS for MQTT, gRPC, and Kafka
- Swap the simulator for a real robot (ESP32/Raspberry Pi)