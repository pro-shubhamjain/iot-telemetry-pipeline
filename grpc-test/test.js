import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROTO_PATH = path.join(
  __dirname,
  '..',
  'analytics-service',
  'src',
  'proto',
  'analytics.proto',
);

const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const proto = grpc.loadPackageDefinition(packageDefinition).analytics;

const client = new proto.AnalyticsService(
  'localhost:5001',
  grpc.credentials.createInsecure(),
);

const request = {
  robotId: 'robot-01',
  readings: [
    { battery: 90, temperature: 32, paused: false },
    { battery: 85, temperature: 33, paused: false },
    { battery: 80, temperature: 34, paused: true },
    { battery: 78, temperature: 35, paused: false },
  ],
};

client.GetFleetHealth(request, (err, response) => {
  if (err) {
    console.error('gRPC call failed:', err.message);
    return;
  }
  console.log('Fleet health response:', response);
});