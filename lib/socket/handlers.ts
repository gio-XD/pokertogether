import type { Server, Socket } from 'socket.io';
import type {
  CreateTablePayload,
  JoinTablePayload,
  TableActionPayload,
  ChatMessage,
} from '../engine/types';
import { Table } from '../engine/table';
import { lobbyManager } from './lobby-manager';
import { C2S, S2C } from './events';
import { generateTableId, generatePlayerId } from '../utils/id';

// Track which table each socket is in
const socketTableMap = new Map<string, string>();
// Track player info per socket
const socketPlayerMap = new Map<string, { id: string; name: string }>();

function getOrCreatePlayer(socket: Socket): { id: string; name: string } {
  let player = socketPlayerMap.get(socket.id);
  if (!player) {
    player = { id: generatePlayerId(), name: `Player_${socket.id.slice(0, 4)}` };
    socketPlayerMap.set(socket.id, player);
  }
  return player;
}

function broadcastTableState(io: Server, table: Table): void {
  const tableId = table.config.id;
  const room = io.sockets.adapter.rooms.get(tableId);
  if (!room) return;

  for (const socketId of room) {
    const player = socketPlayerMap.get(socketId);
    if (player) {
      const state = table.getStateForPlayer(player.id);
      io.to(socketId).emit(S2C.TABLE_STATE, state);
    }
  }
}

function broadcastLobby(io: Server): void {
  io.to('lobby').emit(S2C.LOBBY_TABLE_LIST, lobbyManager.getTableList());
}

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    const player = getOrCreatePlayer(socket);
    socket.emit(S2C.AUTH_SESSION, { playerId: player.id, playerName: player.name });

    // === Auth ===
    socket.on(C2S.AUTH_SET_NAME, (name: string) => {
      if (typeof name === 'string' && name.trim().length > 0 && name.length <= 20) {
        player.name = name.trim();
        socket.emit(S2C.AUTH_SESSION, { playerId: player.id, playerName: player.name });
      }
    });

    // === Lobby ===
    socket.on(C2S.LOBBY_JOIN, () => {
      socket.join('lobby');
      socket.emit(S2C.LOBBY_TABLE_LIST, lobbyManager.getTableList());
    });

    socket.on(C2S.LOBBY_LEAVE, () => {
      socket.leave('lobby');
    });

    socket.on(C2S.TABLE_CREATE, (payload: CreateTablePayload) => {
      const tableId = generateTableId();
      const config = {
        id: tableId,
        name: payload.name || `Table ${tableId.slice(-4)}`,
        mode: payload.mode || 'regular',
        maxPlayers: Math.min(Math.max(payload.maxPlayers || 6, 2), 9),
        smallBlind: payload.smallBlind || 5,
        bigBlind: payload.bigBlind || 10,
        minBuyIn: payload.minBuyIn || payload.bigBlind * 20 || 200,
        maxBuyIn: payload.maxBuyIn || payload.bigBlind * 100 || 1000,
      };

      const table = new Table(config);

      // Listen for table events and broadcast
      table.on((event) => {
        switch (event.type) {
          case 'hand-started':
          case 'action-processed':
          case 'phase-changed':
            broadcastTableState(io, table);
            break;

          case 'showdown':
            broadcastTableState(io, table);
            io.to(tableId).emit(S2C.TABLE_SHOWDOWN, event.data);
            break;

          case 'hand-complete':
            io.to(tableId).emit(S2C.TABLE_HAND_COMPLETE, event.data);
            // After a short delay, broadcast new waiting state
            setTimeout(() => broadcastTableState(io, table), 500);
            broadcastLobby(io);
            break;

          case 'player-joined':
            io.to(tableId).emit(S2C.TABLE_PLAYER_JOINED, event.data);
            broadcastTableState(io, table);
            broadcastLobby(io);
            break;

          case 'player-left':
            io.to(tableId).emit(S2C.TABLE_PLAYER_LEFT, event.data);
            broadcastTableState(io, table);
            broadcastLobby(io);

            // Clean up empty tables
            if (table.state.players.length === 0) {
              lobbyManager.removeTable(tableId);
              broadcastLobby(io);
            }
            break;

          case 'turn-timeout':
            io.to(tableId).emit(S2C.TABLE_TURN_TIMEOUT, event.data);
            break;
        }
      });

      lobbyManager.createTable(table);
      socket.emit(S2C.LOBBY_TABLE_CREATED, { tableId });
      broadcastLobby(io);
    });

    // === Table ===

    // Watch a table (join socket room as spectator, receive state)
    socket.on(C2S.TABLE_WATCH, (tableId: string) => {
      const table = lobbyManager.getTable(tableId);
      if (!table) {
        socket.emit(S2C.TABLE_ERROR, { message: 'Table not found' });
        return;
      }
      socket.join(tableId);
      socketTableMap.set(socket.id, tableId);
      socket.leave('lobby');
      // Send current state to the spectator
      const state = table.getStateForPlayer(player.id);
      socket.emit(S2C.TABLE_STATE, state);
    });

    socket.on(C2S.TABLE_JOIN, (payload: JoinTablePayload) => {
      const table = lobbyManager.getTable(payload.tableId);
      if (!table) {
        socket.emit(S2C.TABLE_ERROR, { message: 'Table not found' });
        return;
      }

      try {
        // Ensure socket is in the room before joinTable triggers broadcast
        socket.join(payload.tableId);
        socketTableMap.set(socket.id, payload.tableId);
        socket.leave('lobby');
        table.joinTable(player.id, player.name, payload.seatIndex, payload.buyIn);
        // Explicitly send updated state to the joining player
        const state = table.getStateForPlayer(player.id);
        socket.emit(S2C.TABLE_STATE, state);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to join table';
        socket.emit(S2C.TABLE_ERROR, { message });
      }
    });

    socket.on(C2S.TABLE_LEAVE, () => {
      const tableId = socketTableMap.get(socket.id);
      if (!tableId) return;

      const table = lobbyManager.getTable(tableId);
      if (table) {
        try {
          table.leaveTable(player.id);
        } catch {
          // Player might not be at this table
        }
      }

      socket.leave(tableId);
      socketTableMap.delete(socket.id);
    });

    socket.on(C2S.TABLE_ACTION, (payload: TableActionPayload) => {
      const tableId = socketTableMap.get(socket.id);
      if (!tableId) return;

      const table = lobbyManager.getTable(tableId);
      if (!table) return;

      try {
        table.handleAction(player.id, payload.action, payload.amount);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Invalid action';
        socket.emit(S2C.TABLE_ERROR, { message });
      }
    });

    socket.on(C2S.TABLE_CHAT, (message: string) => {
      const tableId = socketTableMap.get(socket.id);
      if (!tableId) return;
      if (typeof message !== 'string' || message.trim().length === 0 || message.length > 200) return;

      const chatMessage: ChatMessage = {
        playerId: player.id,
        playerName: player.name,
        message: message.trim(),
        timestamp: Date.now(),
      };

      io.to(tableId).emit(S2C.TABLE_CHAT_MESSAGE, chatMessage);
    });

    // === Disconnect ===
    socket.on('disconnect', () => {
      const tableId = socketTableMap.get(socket.id);
      if (tableId) {
        const table = lobbyManager.getTable(tableId);
        if (table) {
          // Mark player as disconnected, but don't remove immediately
          const playerState = table.state.players.find(p => p.id === player.id);
          if (playerState) {
            playerState.isConnected = false;
            broadcastTableState(io, table);

            // Remove after 60s if still disconnected
            setTimeout(() => {
              const current = table.state.players.find(p => p.id === player.id);
              if (current && !current.isConnected) {
                table.leaveTable(player.id);
              }
            }, 60_000);
          }
        }
      }

      socketTableMap.delete(socket.id);
      socketPlayerMap.delete(socket.id);
    });
  });
}
