import { Socket } from "socket.io";

import { HttpRes } from "@shared/httpMsg/_httpResTemplate";
import { createError } from "../../../middleware/handleError";
import { requireAuth } from "../../../middleware/auth";
import { renderHintNPlayers } from "../../../utils/renderHintNPlayers";

type Ack = (res: any) => void;

/**
 * 女巫查看今晚被狼杀的人（需鉴权，且必须是女巫且未用过解药）
 */
export async function witchGetDie(socket: Socket, _data: any, ack: Ack) {
  const { room, player } = requireAuth(socket);

  if (player.character !== "WITCH") {
    createError({ status: 401, msg: "你的身份无法查看此消息" });
  }
  if (player.characterStatus?.MEDICINE?.usedAt > 0) {
    createError({
      status: 401,
      msg: "你已经用过解药, 无法查看死者",
    });
  }

  const killedByWolfToday = room.players.find(
    (p) =>
      p.die?.fromCharacter === "WEREWOLF" &&
      p.die?.at === room.currentDay
  );

  const ret: HttpRes<string> = {
    status: 200,
    msg: "ok",
    data: "",
  };

  if (!killedByWolfToday) {
    ret.data = "今晚无人被杀害";
  } else {
    ret.data = renderHintNPlayers("今晚被杀害的是:", [
      killedByWolfToday.index,
    ]);
  }

  ack?.(ret);
}
