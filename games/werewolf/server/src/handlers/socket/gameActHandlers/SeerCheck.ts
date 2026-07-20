import { Socket } from "socket.io";

import { getIO } from "../../../ws";
import { GameStatus, TIMEOUT } from "@shared/GameDefs";
import { HttpRes } from "@shared/httpMsg/_httpResTemplate";
import { SeerCheckData } from "@shared/httpMsg/SeerCheckMsg";
import { index } from "@shared/ModelDefs";
import { Events } from "@shared/WSEvents";
import { ChangeStatusMsg } from "@shared/WSMsg/ChangeStatus";
import { createError } from "../../../middleware/handleError";
import { Player } from "../../../models/PlayerModel";
import { Room } from "../../../models/RoomModel";
import { getVoteResult } from "../../../utils/getVoteResult";
import { GameActHandler, Response, startCurrentState, status2Handler } from "./";
import { WitchActHandler } from "./WitchAct";

export const SeerCheckHandler: GameActHandler = {
  curStatus: GameStatus.SEER_CHECK,

  async handleHttpInTheState(
    room: Room,
    player: Player,
    target: index,
    socket: Socket
  ) {
    const targetPlayer = room.getPlayerByIndex(target);

    if (!targetPlayer)
      createError({ status: 400, msg: "未找到此玩家" });
    if (player.characterStatus?.checks?.[room.currentDay])
      createError({ status: 400, msg: "一天只能查验一次" });

    const isWolf = targetPlayer.character === "WEREWOLF";

    player.characterStatus.checks =
      player.characterStatus.checks || [];
    player.characterStatus.checks[room.currentDay] = {
      index: target,
      isWerewolf: isWolf,
    };

    const ret: HttpRes<SeerCheckData> = {
      data: {
        isWolf,
      },
      msg: "ok",
      status: 200,
    };
    return ret;
  },

  startOfState(room: Room) {
    // 如果没有预言家就直接结束此阶段
    if (!room.needingCharacters.includes("SEER"))
      return SeerCheckHandler.endOfState(room);

    startCurrentState(this, room);
  },

  async endOfState(room: Room) {
    WitchActHandler.startOfState(room);
  },
};
