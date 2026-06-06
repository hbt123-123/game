const { v4: uuidv4 } = require('uuid')

class Player {
  constructor(socketId, name) {
    this.id = uuidv4()
    this.socketId = socketId
    this.name = name || `玩家${Math.floor(Math.random() * 1000)}`
    this.role = null
    this.roleName = null
    this.word = null
    this.photo = null
    this.eliminated = false
    this.confirmed = false
    this.votedFor = null
    this.voteCount = 0
    this.isHost = false
  }

  assignRole(role) {
    this.role = role
    if (role === 0) {
      this.roleName = '卧底'
    } else if (role === 1) {
      this.roleName = '平民'
    } else {
      this.roleName = '白板'
    }
  }

  assignWord(word) {
    this.word = word
  }

  setPhoto(photo) {
    this.photo = photo
  }

  markEliminated() {
    this.eliminated = true
  }

  markConfirmed() {
    this.confirmed = true
  }

  resetForNewGame() {
    this.confirmed = false
    this.votedFor = null
    this.voteCount = 0
    this.photo = null
    this.role = null
    this.roleName = null
    this.word = null
    this.eliminated = false
  }

  toEliminatedJSON() {
    return {
      ...this.toPublicJSON(),
      role: this.role,
      roleName: this.roleName,
    }
  }

  toPublicJSON() {
    return {
      id: this.id,
      socketId: this.socketId,
      name: this.name,
      photo: this.photo,
      eliminated: this.eliminated,
      isHost: this.isHost,
    }
  }

  toPrivateJSON() {
    return {
      ...this.toPublicJSON(),
      role: this.role,
      roleName: this.roleName,
      word: this.word,
      confirmed: this.confirmed,
    }
  }
}

module.exports = Player