import { Socket } from "socket.io";

import { IDHeaderName, RoomNumberHeaderName } from "@shared/constants";
import { Room } from "../models/RoomModel";
import { Player } from "../models/PlayerModel";
import { createError } from "./handleError";

type Ack = (res: any) => void;

/**
 * AUTH 事件处理器：建立 socket 会话
 * 前端在 create/join 房间获得 token 后，调用 socket.emit('AUTH', { ID, roomNumber })
 * 服务端把 player 和 room 挂到 socket.data，并 socket.join(roomNumber)
 */
export async function authHandler(socket: Socket, data: any, ack: Ack) {
  try {
    const playerID = data?.[IDHeaderName];
    const roomNumber = data?.[RoomNumberHeaderName];

    if (!playerID || !roomNumber) {
      return ack?.({ status: 401, msg: "缺少鉴权信息", data: {} });
    }

    const room = Room.getRoom(roomNumber);
    const player = room.getPlayerById(playerID); // 自带错误检查

    socket.data.player = player;
    socket.data.room = room;
    socket.join(roomNumber);

    ack?.({ status: 200, msg: "ok", data: {} });
  } catch (err: any) {
    // createError 抛出的 err.message 是 JSON 字符串
    try {
      const parsed = JSON.parse(err.message);
      ack?.({ status: parsed.status || 500, msg: parsed.msg || err.message, data: {} });
    } catch {
      ack?.({ status: err.status || 500, msg: err.msg || err.message, data: {} });
    }
  }
}

/**
 * 工具函数：从 socket.data 取鉴权后的 player 和 room
 * 在需要鉴权的事件处理器中调用
 */
export function requireAuth(socket: Socket): { player: Player; room: Room } {
  if (!socket.data?.player || !socket.data?.room) {
    createError({ status: 401, msg: "未鉴权，请先发送 AUTH 事件" });
  }
  return {
    player: socket.data.player as Player,
    room: socket.data.room as Room,
  };
}
