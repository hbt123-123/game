import { Socket } from "socket.io";

import { index } from "@shared/ModelDefs";
import { HttpRes } from "@shared/httpMsg/_httpResTemplate";
import { createError } from "../../../middleware/handleError";
import { requireAuth } from "../../../middleware/auth";
import { renderHintNPlayers } from "../../../utils/renderHintNPlayers";

type Ack = (res: any) => void;

/**
 * 狼人查看今晚杀人结果（需鉴权，且必须是狼人）
 */
export async function wolfKill(socket: Socket, _data: any, ack: Ack) {
  const { room, player } = requireAuth(socket);

  if (player.character !== "WEREWOLF") {
    createError({ status: 401, msg: "你的身份无法查看此消息" });
  }

  const finalTarget = room.players.find((p) => {
    if (!p.die) return false;
    const { at, fromCharacter } = p.die;
    return at === room.currentDay && fromCharacter === "WEREWOLF";
  });

  let data: { hintText: string; result: index[] };
  if (!finalTarget) {
    data = {
      hintText: "今晚是个平安夜",
      result: null,
    };
  } else {
    data = {
      hintText: "今晚被杀的是",
      result: [finalTarget.index],
    };
  }

  const ret: HttpRes<string> = {
    status: 200,
    msg: "ok",
    data: renderHintNPlayers(data.hintText, data.result),
  };

  ack?.(ret);
}
