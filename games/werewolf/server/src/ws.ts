import { Server, Socket } from "socket.io";

import { Events } from "@shared/WSEvents";

import { authHandler } from "./middleware/auth";
import roomCreate from "./handlers/socket/roomCreate";
import roomJoin from "./handlers/socket/roomJoin";
import roomInit from "./handlers/socket/roomInit";
import gameBegin from "./handlers/socket/gameBegin";
import gameStatus from "./handlers/socket/gameStatus";
import gameAct from "./handlers/socket/gameAct";
import { getWolfs, witchGetDie, wolfKill } from "./handlers/socket/hints";

let _io: Server;

/**
 * 由 GameHub 桥接模块调用，注入 game-registry 创建的 Socket.IO Server 实例
 * 并注册所有 socket 事件处理器
 */
export function setup(io: Server) {
  _io = io;

  getIO().sockets.on("connection", (socket: Socket) => {
    // 鉴权事件（建立 socket 会话，挂载 player/room 到 socket.data）
    socket.on(Events.AUTH, (data, ack) =>
      runHandler(socket, data, ack, authHandler)
    );

    // 房间管理
    socket.on(Events.ROOM_CREATE, (data, ack) =>
      runHandler(socket, data, ack, roomCreate)
    );
    socket.on(Events.ROOM_JOIN_REQ, (data, ack) =>
      runHandler(socket, data, ack, roomJoin)
    );
    socket.on(Events.ROOM_INIT, (data, ack) =>
      runHandler(socket, data, ack, roomInit)
    );

    // 游戏流程
    socket.on(Events.GAME_BEGIN_REQ, (data, ack) =>
      runHandler(socket, data, ack, gameBegin)
    );
    socket.on(Events.GAME_STATUS, (data, ack) =>
      runHandler(socket, data, ack, gameStatus)
    );
    socket.on(Events.GAME_ACT, (data, ack) =>
      runHandler(socket, data, ack, gameAct)
    );

    // 提示信息
    socket.on(Events.HINT_GET_WOLFS, (data, ack) =>
      runHandler(socket, data, ack, getWolfs)
    );
    socket.on(Events.HINT_WITCH_GET_DIE, (data, ack) =>
      runHandler(socket, data, ack, witchGetDie)
    );
    socket.on(Events.HINT_WOLF_KILL, (data, ack) =>
      runHandler(socket, data, ack, wolfKill)
    );
  });
}

/**
 * 统一包装 socket 事件处理器：捕获异常并通过 ack 返回错误响应
 */
async function runHandler(
  socket: Socket,
  data: any,
  ack: (res: any) => void,
  handler: (socket: Socket, data: any, ack: (res: any) => void) => Promise<any> | any
) {
  try {
    await handler(socket, data, ack);
  } catch (err: any) {
    // createError 抛出的 err.message 是 JSON 字符串
    try {
      const parsed = JSON.parse(err.message);
      ack?.({ status: parsed.status || 500, msg: parsed.msg || err.message, data: {} });
    } catch {
      ack?.({ status: err.status || 500, msg: err.msg || err.message, data: {} });
    }
    console.error("[werewolf] handler error:", err);
  }
}

/**
 * 供 handlers 获取 io 实例（用于 getIO().to(room).emit 广播）
 */
export function getIO(): Server {
  if (!_io) throw new Error("io 未初始化，请先调用 setup(io)");
  return _io;
}
