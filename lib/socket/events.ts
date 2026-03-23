// Client → Server events
export const C2S = {
  // Lobby
  LOBBY_JOIN: 'lobby:join',
  LOBBY_LEAVE: 'lobby:leave',

  // Table
  TABLE_CREATE: 'table:create',
  TABLE_WATCH: 'table:watch',
  TABLE_JOIN: 'table:join',
  TABLE_LEAVE: 'table:leave',
  TABLE_ACTION: 'table:action',
  TABLE_REBUY: 'table:rebuy',
  TABLE_CHAT: 'table:chat',
  TABLE_SIT_OUT: 'table:sit-out',

  // Auth
  AUTH_SET_NAME: 'auth:set-name',
} as const;

// Server → Client events
export const S2C = {
  // Lobby
  LOBBY_TABLE_LIST: 'lobby:table-list',
  LOBBY_TABLE_CREATED: 'lobby:table-created',

  // Table
  TABLE_STATE: 'table:state',
  TABLE_ACTION_RESULT: 'table:action-result',
  TABLE_HAND_STARTED: 'table:hand-started',
  TABLE_SHOWDOWN: 'table:showdown',
  TABLE_HAND_COMPLETE: 'table:hand-complete',
  TABLE_PLAYER_JOINED: 'table:player-joined',
  TABLE_PLAYER_LEFT: 'table:player-left',
  TABLE_CHAT_MESSAGE: 'table:chat-message',
  TABLE_TURN_TIMEOUT: 'table:turn-timeout',
  TABLE_ERROR: 'table:error',

  // Auth
  AUTH_SESSION: 'auth:session',

  // General
  ERROR: 'error',
} as const;
