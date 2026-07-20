import { Socket } from "socket.io";

import { GameStatus } from "@shared/GameDefs";
import { HttpRes } from "@shared/httpMsg/_httpResTemplate";
import { Events } from "@shared/WSEvents";
import { createError } from "../../middleware/handleError";
import { requireAuth } from "../../middleware/auth";
import { getIO } from "../../ws";
import { status2Handler } from "./gameActHandlers";

type Ack = (res: any) => void;

/**
 * 房主开始游戏（需鉴权）
 */
export default async function gameBegin(
  socket: Socket,
  _data: any,
  ack: Ack
) {
  const { room } = requireAuth(socket);

  // 房主校验
  const playerID = socket.data.player._id;
  if (room.creatorID !== playerID) {
    createError({ msg: "只有房主才能开始游戏", status: 401 });
  }

  if (room.players.length !== room.needingCharacters.length) {
    createError({ msg: "房间人数未满, 无法开始游戏", status: 401 });
  }

  // 分配身份
  const needingCharacters = [...room.needingCharacters];

  for (let p of room.players) {
    const index = Math.floor(
      Math.random() * needingCharacters.length
    );
    const character = needingCharacters.splice(index, 1)[0];

    p.character = character;
    switch (character) {
      case "GUARD":
        p.characterStatus = {
          protects: [],
        };
        break;
      case "HUNTER":
        p.characterStatus = {
          shootAt: {
            day: -1,
            player: -1,
          },
        };
        break;
      case "SEER":
        p.characterStatus = {
          checks: [],
        };
        break;
      case "WEREWOLF":
        p.characterStatus = {
          wantToKills: [],
        };
        break;
      case "WITCH":
        p.characterStatus = {
          POISON: { usedDay: -1, usedAt: -1 },
          MEDICINE: { usedDay: -1, usedAt: -1 },
        };
        break;
      case "VILLAGER":
        p.characterStatus = {};
      default:
        break;
    }
  }

  // 通知所有人游戏开始
  getIO().to(room.roomNumber).emit(Events.GAME_BEGIN);

  // 进入第一个状态（狼人杀人，不显示闭眼提示）
  status2Handler[GameStatus.WOLF_KILL].startOfState(room, false);

  const ret: HttpRes = {
    data: {},
    msg: "ok",
    status: 200,
  };
  ack?.(ret);
}
