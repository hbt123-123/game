import { Socket } from "socket.io";

import { HttpRes } from "@shared/httpMsg/_httpResTemplate";
import { GameStatusResponse } from "@shared/httpMsg/GameStatusMsg";
import { requireAuth } from "../../middleware/auth";

type Ack = (res: any) => void;

/**
 * 前端刷新数据（需鉴权）
 */
export default async function gameStatus(
  socket: Socket,
  _data: any,
  ack: Ack
) {
  const { room, player: curPlayer } = requireAuth(socket);

  const ret: HttpRes<GameStatusResponse> = {
    status: 200,
    msg: "ok",
    data: {
      self: curPlayer,
      curDay: room.currentDay,
      gameStatus: room.curStatus,
      players: room.isFinished ? room.players : room.choosePublicInfo(),
    },
  };

  ack?.(ret);
}
