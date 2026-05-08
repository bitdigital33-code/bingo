import { Injectable } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  afterInit(server: Server) {
    this.server = server;
  }

  handleConnection(client: Socket) {
    const roomCode = String(client.handshake.query.roomCode ?? '');

    if (roomCode) {
      client.join(roomCode);
    }
  }

  async emitRoom(roomCode: string, event: string, payload: unknown) {
    if (!this.server) {
      return;
    }
    this.server.to(roomCode).emit(event, payload);
  }
}
