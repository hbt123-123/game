import { Socket } from "socket.io";

import { getIO } from "../../../ws";
import { GameStatus, TIMEOUT } from "@shared/GameDefs";
import { index } from "@shared/ModelDefs";
import { Events } from "@shared/WSEvents";
import { ChangeStatusMsg } from "@shared/WSMsg/ChangeStatus";
import { ShowMsg } from "@shared/WSMsg/ShowMsg";
import { Player } from "../../../models/PlayerModel";
import { Room } from "../../../models/RoomModel";
import { getVoteResult } from "../../../utils/getVoteResult";
import { GameActHandler, Response, startCurrentState, status2Handler } from "./";
import { WolfKillCheckHandler } from "./WolfKillCheck";

export const WolfKillHandler: GameActHandler = {
  curStatus: GameStatus.WOLF_KILL,

  async handleHttpInTheState(
    room: Room,
    player: Player,
    target: index,
    socket: Socket
  ) {
    // 记录所作的操作
    player.characterStatus.wantToKills =
      player.characterStatus.wantToKills || [];
    player.characterStatus.wantToKills[room.currentDay] = target;

    return {
      status: 200,
      msg: "ok",
      data: { target },
    };
  },

  startOfState(room: Room, showCloseEye = true) {
    room.currentDay++;
    startCurrentState(this, room);
    if (showCloseEye)
      getIO().to(room.roomNumber).emit(Events.SHOW_MSG, {
        innerHTML: "天黑请闭眼👁️",
      } as ShowMsg);
  },

  async endOfState(room: Room) {
    // 准备工作
    const werewolfs = room.players.filter(
      (p) => p.character === "WEREWOLF"
    );
    const today = room.currentDay;
    const votes = werewolfs.map((p) => ({
      from: p.index,
      voteAt: p.characterStatus?.wantToKills?.[today],
    }));
    // console.log("# WolfKill", { votes });

    // 找到死者
    const voteRes = getVoteResult(votes);
    // console.log("# WolfKill", { voteRes });
    if (voteRes !== null) {
      // 如果没有放弃杀人'
      const toKillIndex = voteRes[0];
      const toKillPlayer = room.getPlayerByIndex(toKillIndex);
      if (toKillPlayer) {
        // 设置死亡
        toKillPlayer.die = {
          at: today,
          fromIndex: werewolfs.reduce<index[]>(
            (prev, cur) =>
              cur.characterStatus?.wantToKills?.[today] ===
              toKillIndex
                ? [...prev, cur.index]
                : prev,
            [] as index[]
          ),
          fromCharacter: "WEREWOLF",
        };
      }
      // console.log("# WolfKill", { toKillPlayer });
    }

    // 进入下一状态， 狼人确认杀人结果
    WolfKillCheckHandler.startOfState(room);
  },
};
