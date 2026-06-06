const { SOCKET_EVENTS: E } = require('../config')
const Player = require('../game/Player')

function setupSocketHandlers(io, gameManager) {
  io.on('connection', (socket) => {
    console.log(`[连接] 新客户端连接: ${socket.id}`)

    socket.on(E.ROOM_CREATE, ({ playerName }) => {
      try {
        const existingRoom = gameManager.findRoomBySocketId(socket.id)
        if (existingRoom) {
          return socket.emit(E.ERROR, { message: '你已在房间中，请先退出' })
        }

        const room = gameManager.createRoom(playerName, socket.id)
        socket.join(room.id)
        const player = room.players.get(socket.id)
        socket.emit(E.ROOM_CREATED, {
          room: room.toLobbyJSON(),
          player: player.toPrivateJSON(),
        })
        console.log(`[房间] 创建房间: ${room.id}, 房主: ${playerName}`)
      } catch (err) {
        socket.emit(E.ERROR, { message: '创建房间失败', detail: err.message })
      }
    })

    socket.on(E.ROOM_JOIN, ({ roomId, playerName }) => {
      try {
        const existingRoom = gameManager.findRoomBySocketId(socket.id)
        if (existingRoom) {
          return socket.emit(E.ERROR, { message: '你已在房间中，请先退出' })
        }

        const room = gameManager.getRoom(roomId)
        if (!room) {
          return socket.emit(E.ERROR, { message: '房间不存在' })
        }
        if (room.phase !== 'lobby') {
          return socket.emit(E.ERROR, { message: '游戏已开始，无法加入' })
        }

        const player = room.addPlayer(playerName, socket.id)
        if (!player) {
          const msg = room.players.size >= room.config.playerCount
            ? `房间已满（${room.config.playerCount}人），请房主调高人数后再试`
            : '房间已满'
          return socket.emit(E.ERROR, { message: msg })
        }

        socket.join(room.id)
        socket.emit(E.ROOM_JOINED, {
          room: room.toLobbyJSON(),
          player: player.toPrivateJSON(),
        })
        socket.to(room.id).emit(E.ROOM_PLAYER_JOINED, {
          player: player.toPublicJSON(),
          room: room.toLobbyJSON(),
        })
        console.log(`[房间] ${playerName} 加入房间: ${roomId}`)
      } catch (err) {
        socket.emit(E.ERROR, { message: '加入房间失败', detail: err.message })
      }
    })

    socket.on(E.ROOM_LEAVE, () => {
      handleLeaveRoom(socket, gameManager, io)
    })

    socket.on(E.REJOIN, ({ roomId, playerId }) => {
      try {
        const room = gameManager.getRoom(roomId)
        if (!room) return socket.emit(E.ERROR, { message: '房间不存在' })

        const player = room.rejoinPlayer(playerId, socket.id)
        if (!player) return socket.emit(E.ERROR, { message: '重连失败' })

        socket.join(room.id)

        const timer = gameManager.pendingDisconnects.get(playerId)
        if (timer) {
          clearTimeout(timer)
          gameManager.pendingDisconnects.delete(playerId)
        }

        socket.emit(E.ROOM_JOINED, {
          room: room.toLobbyJSON(),
          player: player.toPrivateJSON(),
        })

        if (room.phase !== 'lobby') {
          socket.emit(E.GAME_STATE, { room: room.toGameStateJSON() })
        }

        console.log(`[重连] 玩家 ${player.name} 重新加入房间: ${roomId}`)
      } catch (err) {
        socket.emit(E.ERROR, { message: '重连失败', detail: err.message })
      }
    })

    socket.on(E.GAME_CONFIG, ({ playerCount, spyCount, blankCount }) => {
      try {
        const room = gameManager.findRoomBySocketId(socket.id)
        if (!room) return socket.emit(E.ERROR, { message: '你不在任何房间中' })
        if (socket.id !== room.hostSocketId) {
          return socket.emit(E.ERROR, { message: '只有房主可以修改配置' })
        }

        room.updateConfig(playerCount, spyCount, blankCount)
        io.to(room.id).emit(E.ROOM_UPDATE, { room: room.toLobbyJSON() })
        console.log(`[配置] 房间 ${room.id} 更新: ${playerCount}人 ${spyCount}卧底 ${blankCount || 0}白板`)
      } catch (err) {
        socket.emit(E.ERROR, { message: '配置更新失败', detail: err.message })
      }
    })

    socket.on(E.GAME_START, () => {
      try {
        const room = gameManager.findRoomBySocketId(socket.id)
        if (!room) return socket.emit(E.ERROR, { message: '你不在任何房间中' })
        if (socket.id !== room.hostSocketId) {
          return socket.emit(E.ERROR, { message: '只有房主可以开始游戏' })
        }
        if (!room.canStart()) {
          return socket.emit(E.ERROR, {
            message: `需要 ${room.config.playerCount} 名玩家，当前只有 ${room.players.size} 名`,
          })
        }

        room.startGame()
        io.to(room.id).emit(E.GAME_STARTED, { room: room.toGameStateJSON() })

        for (const player of room.players.values()) {
          io.to(player.socketId).emit(E.GAME_REVEAL, {
            player: player.toPrivateJSON(),
          })
        }
        const roles = Array.from(room.players.values()).map(p => `${p.name}=${p.roleName}(${p.word})`).join(', ')
        console.log(`[游戏] 房间 ${room.id} 游戏开始 | ${roles}`)
      } catch (err) {
        socket.emit(E.ERROR, { message: '游戏开始失败', detail: err.message })
      }
    })

    socket.on(E.GAME_REVEAL, () => {
      try {
        const room = gameManager.findRoomBySocketId(socket.id)
        if (!room) return

        const playerData = room.revealWord(socket.id)
        if (!playerData) return

        socket.emit(E.GAME_REVEAL, {
          player: playerData,
          revealIndex: room.currentPlayerIndex + 1,
          totalPlayers: room.revealOrder.length,
        })
      } catch (err) {
        socket.emit(E.ERROR, { message: '查看词语失败', detail: err.message })
      }
    })

    socket.on(E.GAME_CONFIRMED, () => {
      try {
        const room = gameManager.findRoomBySocketId(socket.id)
        if (!room) return

        const player = room.players.get(socket.id)
        const result = room.confirmReveal(socket.id)
        if (!result) return

        console.log(`[确认] ${player?.name} 确认查看词语 → ${result}`)

        if (result === 'phaseChange') {
          io.to(room.id).emit(E.GAME_STATE, { room: room.toGameStateJSON() })

          const speaker = room.getCurrentSpeaker()
          if (speaker) {
            io.to(room.id).emit(E.GAME_SPEAK, {
              speakerSocketId: speaker.socketId,
              speakerName: speaker.name,
              discussIndex: room.discussIndex,
              totalSpeakers: room.discussOrder.length,
            })
          }
          console.log(`[阶段] 房间 ${room.id} 进入讨论阶段，首位发言: ${speaker?.name}`)
          return
        }

        io.to(room.id).emit(E.GAME_STATE, { room: room.toGameStateJSON() })
      } catch (err) {
        socket.emit(E.ERROR, { message: '确认失败', detail: err.message })
      }
    })

    socket.on(E.GAME_SPEAK_CONFIRMED, () => {
      try {
        const room = gameManager.findRoomBySocketId(socket.id)
        if (!room) return

        const player = room.players.get(socket.id)
        const result = room.confirmSpeak(socket.id)
        if (!result) return

        console.log(`[发言] ${player?.name} 完成发言 → ${result}`)

        if (result === 'discussDone') {
          io.to(room.id).emit(E.GAME_STATE, { room: room.toGameStateJSON() })
          console.log(`[阶段] 房间 ${room.id} 讨论结束，进入投票阶段`)
          return
        }

        const speaker = room.getCurrentSpeaker()
        if (speaker) {
          io.to(room.id).emit(E.GAME_SPEAK, {
            speakerSocketId: speaker.socketId,
            speakerName: speaker.name,
            discussIndex: room.discussIndex,
            totalSpeakers: room.discussOrder.length,
          })
          console.log(`[发言] 下一位发言: ${speaker.name} (${room.discussIndex + 1}/${room.discussOrder.length})`)
        }

        io.to(room.id).emit(E.GAME_STATE, { room: room.toGameStateJSON() })
      } catch (err) {
        socket.emit(E.ERROR, { message: '发言确认失败', detail: err.message })
      }
    })

    socket.on(E.GAME_VOTE, ({ targetPlayerId }) => {
      try {
        const room = gameManager.findRoomBySocketId(socket.id)
        if (!room) return socket.emit(E.ERROR, { message: '你不在任何房间中' })

        const voter = room.players.get(socket.id)
        const target = Array.from(room.players.values()).find(p => p.id === targetPlayerId)
        const result = room.castVote(socket.id, targetPlayerId)
        if (!result) {
          console.log(`[投票] ${voter?.name} 投票失败 (目标: ${target?.name || targetPlayerId})`)
          return socket.emit(E.ERROR, { message: '投票失败' })
        }

        if (result.status === 'voted') {
          console.log(`[投票] ${voter?.name} → ${target?.name} (等待其他人)`)
          socket.emit(E.GAME_VOTE_RESULT, {
            status: 'voted',
            voterSocketId: socket.id,
            votes: room.getVoteResults(),
          })
        } else if (result.status === 'eliminated') {
          console.log(`[投票] ${voter?.name} → ${target?.name} → ${result.eliminated.name}被淘汰! 身份:${result.eliminated.roleName} ${result.winner ? '游戏结束:' + result.winner : '继续'}`)
          io.to(room.id).emit(E.GAME_VOTE_RESULT, {
            status: 'eliminated',
            eliminated: result.eliminated,
            votes: result.votes,
            winner: result.winner,
          })

          if (result.winner) {
            io.to(room.id).emit(E.GAME_OVER, {
              winner: result.winner,
              room: room.toGameStateJSON(),
            })
          } else {
            setTimeout(() => {
              room.nextRound()
              io.to(room.id).emit(E.GAME_STATE, { room: room.toGameStateJSON() })
              const speaker = room.getCurrentSpeaker()
              if (speaker) {
                io.to(room.id).emit(E.GAME_SPEAK, {
                  speakerSocketId: speaker.socketId,
                  speakerName: speaker.name,
                  discussIndex: room.discussIndex,
                  totalSpeakers: room.discussOrder.length,
                })
              }
              console.log(`[阶段] 房间 ${room.id} 第${room.round}轮讨论开始，首位发言: ${speaker?.name}`)
            }, 3000)
          }
        } else if (result.status === 'tie') {
          console.log(`[投票] ${voter?.name} → ${target?.name} → 平票! 返回讨论重新发言`)
          io.to(room.id).emit(E.GAME_VOTE_RESULT, {
            status: 'tie',
            tiedPlayers: result.tiedPlayers,
            votes: result.votes,
          })
          setTimeout(() => {
            const tiedIds = result.tiedPlayers.map(p => p.id)
            room.restartDiscuss(tiedIds)
            io.to(room.id).emit(E.GAME_STATE, { room: room.toGameStateJSON() })
            const speaker = room.getCurrentSpeaker()
            if (speaker) {
              io.to(room.id).emit(E.GAME_SPEAK, {
                speakerSocketId: speaker.socketId,
                speakerName: speaker.name,
                discussIndex: room.discussIndex,
                totalSpeakers: room.discussOrder.length,
              })
            }
            console.log(`[阶段] 房间 ${room.id} 第${room.round}轮 (平票第${room.tieRound}次) 讨论重启，首位发言: ${speaker?.name}`)
          }, 3000)
        }
      } catch (err) {
        socket.emit(E.ERROR, { message: '投票失败', detail: err.message })
      }
    })

    socket.on(E.GAME_RESTART, () => {
      try {
        const room = gameManager.findRoomBySocketId(socket.id)
        if (!room) return
        if (socket.id !== room.hostSocketId) {
          return socket.emit(E.ERROR, { message: '只有房主可以重新开始' })
        }

        room.restart()
        io.to(room.id).emit(E.ROOM_UPDATE, { room: room.toLobbyJSON() })
        console.log(`[游戏] 房间 ${room.id} 重新开始`)
      } catch (err) {
        socket.emit(E.ERROR, { message: '重新开始失败', detail: err.message })
      }
    })

    socket.on(E.DISCONNECT, () => {
      const room = gameManager.findRoomBySocketId(socket.id)
      if (!room) {
        console.log(`[断开] 客户端断开: ${socket.id}`)
        return
      }

      const player = room.players.get(socket.id)
      if (!player) return

      console.log(`[断开] 玩家 ${player.name} 断开，30秒后移除: ${socket.id}`)

      const timer = setTimeout(() => {
        gameManager.pendingDisconnects.delete(player.id)
        handleLeaveRoom(socket, gameManager, io)
      }, 30000)

      gameManager.pendingDisconnects.set(player.id, timer)
    })
  })
}

function handleLeaveRoom(socket, gameManager, io) {
  const room = gameManager.findRoomBySocketId(socket.id)
  if (!room) return

  const result = room.removePlayer(socket.id)
  if (!result) return

  socket.leave(room.id)

  if (result.roomEmpty) {
    gameManager.removeRoom(room.id)
    console.log(`[房间] 房间 ${room.id} 已删除（无玩家）`)
    return
  }

  io.to(room.id).emit(E.ROOM_PLAYER_LEFT, {
    player: result.player.toPublicJSON(),
    room: room.toLobbyJSON(),
    newHostSocketId: result.newHostSocketId,
  })

  if (room.phase !== 'lobby') {
    io.to(room.id).emit(E.GAME_STATE, { room: room.toGameStateJSON() })
  }
}

module.exports = { setupSocketHandlers }