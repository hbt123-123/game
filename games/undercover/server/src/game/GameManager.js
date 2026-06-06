const { Room } = require('./Room')

class GameManager {
  constructor() {
    this.rooms = new Map()
    this.pendingDisconnects = new Map()
  }

  createRoom(hostName, hostSocketId) {
    const room = new Room(hostName, hostSocketId)
    this.rooms.set(room.id, room)
    return room
  }

  getRoom(roomId) {
    return this.rooms.get(roomId)
  }

  findRoomBySocketId(socketId) {
    for (const room of this.rooms.values()) {
      if (room.players.has(socketId)) {
        return room
      }
    }
    return null
  }

  findPlayerById(playerId) {
    for (const room of this.rooms.values()) {
      for (const player of room.players.values()) {
        if (player.id === playerId) {
          return { room, player }
        }
      }
    }
    return null
  }

  removeRoom(roomId) {
    this.rooms.delete(roomId)
  }

  getAllRooms() {
    return Array.from(this.rooms.values()).map(r => ({
      id: r.id,
      playerCount: r.players.size,
      phase: r.phase,
    }))
  }
}

module.exports = GameManager