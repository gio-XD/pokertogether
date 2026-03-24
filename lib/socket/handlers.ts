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
// Reverse lookup: playerId → socketId (for reconnection)
const playerIdToSocketId = new Map<string, string>();

function getOrCreatePlayer(socket: Socket, requestedId?: string): { id: string; name: string } {
  let player = socketPlayerMap.get(socket.id);
  if (!player) {
    // If client provides a previously known playerId, try to reclaim it
    const id = requestedId || generatePlayerId();
    player = { id, name: `Player_${socket.id.slice(0, 4)}` };
    socketPlayerMap.set(socket.id, player);
    playerIdToSocketId.set(id, socket.id);
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
    // Player is created lazily after auth:restore or default

    let player: { id: string; name: string } | null = null;

    function ensurePlayer(): { id: string; name: string } {
      if (!player) {
        player = getOrCreatePlayer(socket);
      }
      return player;
    }

    // === Auth ===

    // Client restores a previous playerId from localStorage
    socket.on('auth:restore', (data: { playerId: string; playerName: string }) => {
      const oldSocketId = playerIdToSocketId.get(data.playerId);
      if (oldSocketId) {
        socketPlayerMap.delete(oldSocketId);
      }
      player = { id: data.playerId, name: data.playerName || `Player_${socket.id.slice(0, 4)}` };
      socketPlayerMap.set(socket.id, player);
      playerIdToSocketId.set(data.playerId, socket.id);
      socket.emit(S2C.AUTH_SESSION, { playerId: player.id, playerName: player.name });

      // If player was at a table, reconnect them
      for (const [, table] of lobbyManager.getAllTables()) {
        const existing = table.state.players.find(p => p.id === data.playerId);
        if (existing) {
          const tableId = table.config.id;
          socket.join(tableId);
          socketTableMap.set(socket.id, tableId);
          // Mark reconnected
          existing.isConnected = true;
          broadcastTableState(io, table);
          break;
        }
      }
    });

    socket.on(C2S.AUTH_SET_NAME, (name: string) => {
      const p = ensurePlayer();
      if (typeof name === 'string' && name.trim().length > 0 && name.length <= 20) {
        p.name = name.trim();
        socket.emit(S2C.AUTH_SESSION, { playerId: p.id, playerName: p.name });
      }
    });

    // === Lobby ===
    socket.on(C2S.LOBBY_JOIN, () => {
      ensurePlayer();
      socket.join('lobby');
      socket.emit(S2C.LOBBY_TABLE_LIST, lobbyManager.getTableList());
    });

    socket.on(C2S.LOBBY_LEAVE, () => {
      socket.leave('lobby');
    });

    socket.on(C2S.TABLE_CREATE, (payload: CreateTablePayload) => {
      ensurePlayer();
      const tableId = generateTableId();
      const bb = payload.bigBlind || 10;
      const config = {
        id: tableId,
        name: payload.name || `Table ${tableId.slice(-4)}`,
        mode: payload.mode || 'regular',
        maxPlayers: Math.min(Math.max(payload.maxPlayers || 6, 2), 9),
        smallBlind: payload.smallBlind || 5,
        bigBlind: bb,
        buyIn: payload.buyIn || 1000,
      };

      const table = new Table(config);

      // Listen for table events and broadcast
      table.on((event) => {
        switch (event.type) {
          case 'state-update':
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
            // Broadcast the post-win state after a delay
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
      const p = ensurePlayer();
      const table = lobbyManager.getTable(tableId);
      if (!table) {
        socket.emit(S2C.TABLE_ERROR, { message: 'Table not found' });
        return;
      }
      socket.join(tableId);
      socketTableMap.set(socket.id, tableId);
      socket.leave('lobby');

      // If player is already at this table (reconnection), mark connected
      const existing = table.state.players.find(pl => pl.id === p.id);
      if (existing) {
        existing.isConnected = true;
        broadcastTableState(io, table);
      } else {
        const state = table.getStateForPlayer(p.id);
        socket.emit(S2C.TABLE_STATE, state);
      }
    });

    socket.on(C2S.TABLE_JOIN, (payload: JoinTablePayload) => {
      const p = ensurePlayer();
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
        table.joinTable(p.id, p.name, payload.seatIndex);
        // Explicitly send updated state to the joining player
        const state = table.getStateForPlayer(p.id);
        socket.emit(S2C.TABLE_STATE, state);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to join table';
        socket.emit(S2C.TABLE_ERROR, { message });
      }
    });

    // Ready toggle
    socket.on('table:ready', () => {
      const p = ensurePlayer();
      const tableId = socketTableMap.get(socket.id);
      if (!tableId) return;
      const table = lobbyManager.getTable(tableId);
      if (!table) return;
      table.toggleReady(p.id);
    });

    socket.on(C2S.TABLE_LEAVE, () => {
      const p = ensurePlayer();
      const tableId = socketTableMap.get(socket.id);
      if (!tableId) return;

      const table = lobbyManager.getTable(tableId);
      if (table) {
        try {
          table.leaveTable(p.id);
        } catch {
          // Player might not be at this table
        }
      }

      socket.leave(tableId);
      socketTableMap.delete(socket.id);
    });

    socket.on(C2S.TABLE_ACTION, (payload: TableActionPayload) => {
      const p = ensurePlayer();
      const tableId = socketTableMap.get(socket.id);
      if (!tableId) return;

      const table = lobbyManager.getTable(tableId);
      if (!table) return;

      try {
        table.handleAction(p.id, payload.action, payload.amount);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Invalid action';
        socket.emit(S2C.TABLE_ERROR, { message });
      }
    });

    socket.on(C2S.TABLE_CHAT, (message: string) => {
      const p = ensurePlayer();
      const tableId = socketTableMap.get(socket.id);
      if (!tableId) return;
      if (typeof message !== 'string' || message.trim().length === 0 || message.length > 200) return;

      const chatMessage: ChatMessage = {
        playerId: p.id,
        playerName: p.name,
        message: message.trim(),
        timestamp: Date.now(),
      };

      io.to(tableId).emit(S2C.TABLE_CHAT_MESSAGE, chatMessage);
    });

    // === Disconnect ===
    socket.on('disconnect', () => {
      const p = socketPlayerMap.get(socket.id);
      const tableId = socketTableMap.get(socket.id);
      if (tableId && p) {
        const table = lobbyManager.getTable(tableId);
        if (table) {
          const playerState = table.state.players.find(pl => pl.id === p.id);
          if (playerState) {
            playerState.isConnected = false;
            broadcastTableState(io, table);

            // Remove after 120s if still disconnected
            setTimeout(() => {
              const current = table.state.players.find(pl => pl.id === p.id);
              if (current && !current.isConnected) {
                table.leaveTable(p.id);
              }
            }, 120_000);
          }
        }
      }

      socketTableMap.delete(socket.id);
      socketPlayerMap.delete(socket.id);
      // Don't delete from playerIdToSocketId — needed for reconnection
    });
  });
}
