import { Socket } from "socket.io";

import { InitRoomResponse } from "@shared/httpMsg/InitRoomMsg";
import { requireAuth } from "../../middleware/auth";

type Ack = (res: any) => void;

/**
 * 进入房间时拉取最新房间数据（需鉴权）
 */
export default async function roomInit(
  socket: Socket,
  _data: any,
  ack: Ack
) {
  const { room } = requireAuth(socket);

  const ret: InitRoomResponse = {
    status: 200,
    msg: "ok",
    data: {
      players: room.choosePublicInfo(),
      needingCharacters: room.needingCharacters,
    },
  };

  ack?.(ret);
}
