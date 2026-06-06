import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || ''
const SOCKET_PATH = '/undercover/socket.io'

let socket = null

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL || undefined, {
      path: SOCKET_PATH,
      autoConnect: false,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export const EVENTS = {
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_CREATED: 'room:created',
  ROOM_JOINED: 'room:joined',
  ROOM_PLAYER_JOINED: 'room:playerJoined',
  ROOM_PLAYER_LEFT: 'room:playerLeft',
  ROOM_UPDATE: 'room:update',

  GAME_CONFIG: 'game:config',
  GAME_START: 'game:start',
  GAME_STARTED: 'game:started',
  GAME_REVEAL: 'game:reveal',
  GAME_CONFIRMED: 'game:confirmed',
  GAME_SPEAK: 'game:speak',
  GAME_SPEAK_CONFIRMED: 'game:speakConfirmed',
  GAME_VOTE: 'game:vote',
  GAME_VOTE_RESULT: 'game:voteResult',
  GAME_STATE: 'game:state',
  GAME_OVER: 'game:over',
  GAME_RESTART: 'game:restart',

  ERROR: 'error',
  REJOIN: 'room:rejoin',
}