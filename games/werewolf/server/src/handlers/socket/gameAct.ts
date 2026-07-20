import { Socket } from "socket.io";

import CharacterAct from "@shared/httpMsg/CharacterAct";
import { createError } from "../../middleware/handleError";
import { requireAuth } from "../../middleware/auth";
import { status2Handler } from "./gameActHandlers";
import { validateIdentity } from "./gameActHandlers/validateIdentity";

type Ack = (res: any) => void;

/**
 * 处理玩家游戏操作（需鉴权）
 * 根据当前游戏状态分发到对应的 gameActHandler
 */
export default async function gameAct(
  socket: Socket,
  data: CharacterAct,
  ack: Ack
) {
  const { room, player } = requireAuth(socket);

  const isValidate = validateIdentity(room, player);
  if (isValidate !== true) {
    createError({ status: 401, msg: isValidate });
  }

  const gameStatus = room.curStatus;

  // 策略模式：分发到对应状态的处理函数
  // 注意：原 ctx 参数已替换为 socket，便于 handler 内部广播
  const res = await status2Handler[gameStatus]?.handleHttpInTheState?.(
    room,
    player,
    data.target,
    socket
  );

  ack?.(res);
}
