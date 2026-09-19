import { io } from 'socket.io-client';
const socket = io('http://localhost:3000');

socket.on('connect', () => console.log('Connected to backend WebSocket'));
socket.on('telemetry', (data) => console.log('Got telemetry:', data));
socket.on('status', (data) => console.log('Got status:', data));