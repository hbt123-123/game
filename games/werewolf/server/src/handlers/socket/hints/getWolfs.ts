import { Socket } from "socket.io";

import { HttpRes } from "@shared/httpMsg/_httpResTemplate";
import { createError } from "../../../middleware/handleError";
import { requireAuth } from "../../../middleware/auth";
import { renderHintNPlayers } from "../../../utils/renderHintNPlayers";

type Ack = (res: any) => void;

/**
 * 狼人查看狼队友（需鉴权，且必须是狼人）
 */
export async function getWolfs(socket: Socket, _data: any, ack: Ack) {
  const { room, player } = requireAuth(socket);
  const playerID = player._id;

  if (player.character !== "WEREWOLF") {
    createError({ status: 401, msg: "你的身份无法查看此消息" });
  }

  const wolfs = room.players
    .filter((p) => p.character === "WEREWOLF" && p._id !== playerID)
    .map((p) => p.index);

  const ret: HttpRes<string> = {
    status: 200,
    msg: "ok",
    data: "",
  };

  if (wolfs.length) {
    ret.data = renderHintNPlayers("狼队友是:", wolfs);
  } else {
    ret.data = "你没有狼队友";
  }

  ack?.(ret);
}
