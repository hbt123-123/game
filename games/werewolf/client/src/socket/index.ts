import { io, Socket } from "socket.io-client";

import { SOCKET_PATH } from "@shared/constants";
import { Events } from "@shared/WSEvents";
import { getToken } from "../utils/token";
// handlers
import changeStatus from "./changeStatus";
import gameBegin from "./gameBegin";
import gameEnd from "./gameEnd";
import roomJoin from "./roomJoin";
import showWSMsg from "./showWSMsg";

let socket: Socket | null = null;

/**
 * 建立到 werewolf 命名空间的 socket 连接，并注册广播事件
 */
export function connectSocket(): Socket {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  socket = io({
    path: SOCKET_PATH,
  });

  socket.on("connect", () => {
    // console.log("#ws connected");
  });

  socket.on(Events.CHANGE_STATUS, changeStatus);
  socket.on(Events.GAME_BEGIN, gameBegin);
  socket.on(Events.GAME_END, gameEnd);
  socket.on(Events.ROOM_JOIN, roomJoin);
  socket.on(Events.SHOW_MSG, showWSMsg);

  return socket;
}

/**
 * 发送 AUTH 事件完成鉴权（基于 localStorage 中的 token）
 * @returns 是否鉴权成功
 */
export async function authSocket(): Promise<boolean> {
  if (!socket) return false;
  const token = getToken();
  if (!token) return false;

  return new Promise<boolean>((resolve) => {
    socket!.emit(
      Events.AUTH,
      {
        "player-id": token.ID,
        "room-number": token.roomNumber,
      },
      (res: { status: number; msg: string; data: any }) => {
        resolve(res && res.status === 200);
      }
    );
  });
}

/**
 * 连接 socket 并完成鉴权（用于创建/加入房间后）
 */
export async function connectAndAuth(): Promise<Socket | null> {
  const s = connectSocket();
  // 等待连接建立
  await new Promise<void>((resolve) => {
    if (s.connected) resolve();
    else s.once("connect", () => resolve());
  });
  const ok = await authSocket();
  if (!ok) {
    console.error("[socket] AUTH 失败");
    return null;
  }
  return s;
}

export function getSocket(): Socket | null {
  return socket;
}

export { Events };
