import { Socket } from "socket.io";

import { getIO } from "../../../ws";
import { GameStatus, TIMEOUT } from "@shared/GameDefs";
import { index } from "@shared/ModelDefs";
import { Events } from "@shared/WSEvents";
import { ChangeStatusMsg } from "@shared/WSMsg/ChangeStatus";
import { ShowMsg } from "@shared/WSMsg/ShowMsg";
import { createError } from "../../../middleware/handleError";
import { Player } from "../../../models/PlayerModel";
import { Room } from "../../../models/RoomModel";
import { getVoteResult } from "../../../utils/getVoteResult";
import { renderHintNPlayers } from "../../../utils/renderHintNPlayers";
import { GameActHandler, Response, startCurrentState } from "./";
import { HunterCheckHandler } from "./HunterCheck";
import { SheriffAssignHandler } from "./SheriffAssign";

export const HunterShootHandler: GameActHandler = {
  curStatus: GameStatus.HUNTER_SHOOT,

  async handleHttpInTheState(
    room: Room,
    player: Player,
    target: index,
    socket: Socket
  ) {
    // console.log("# HunterShoot", { player });
    if (player.die?.fromCharacter === "WITCH") {
      // 如果被女巫毒死了就不能开枪
      createError({
        msg: "你被女巫毒死, 无法开枪",
        status: 401,
      });
    }

    if (player.characterStatus.shootAt.player > 0)
      createError({ msg: "你已经开过枪了", status: 401 });

    const targetPlayer = room.getPlayerByIndex(target);
    player.characterStatus.shootAt = {
      day: room.currentDay,
      player: target,
    };
    targetPlayer.isAlive = false;
    targetPlayer.isDying = true;
    targetPlayer.die = {
      at: room.currentDay,
      fromCharacter: "HUNTER",
      fromIndex: [player.index],
    };

    return {
      status: 200,
      msg: "ok",
      data: { target },
    };
  },

  startOfState(room) {
    // 玩家死亡后依次进行以下检查
    // 遗言发表检查, 猎人开枪检查, 警长传递警徽检查
    if (!showHunter(room)) {
      // console.log("# HunterShoot", "not show hunter");
      HunterShootHandler.endOfState(room, false);
    } else {
      // console.log("# HunterShoot", "show hunter");
      startCurrentState(this, room, true);
    }
  },

  async endOfState(room, showHunter: boolean) {
    if (!showHunter) {
      // 无猎人? 直接取消这两个阶段
      // console.log("# HunterShoot", "really not show hunter");
      return SheriffAssignHandler.startOfState(room);
    }

    const shotByHunter = room.players.find(
      (p) => p.die?.fromCharacter === "HUNTER"
    );
    if (!shotByHunter) {
      // 到点了未选择则不进行操作, 直接进入警长传警徽阶段, 或者无猎人
      getIO().to(room.roomNumber).emit(Events.SHOW_MSG, {
        innerHTML: "死者不是猎人或选择不开枪",
      } as ShowMsg);
      HunterCheckHandler.startOfState(room);
    } else {
      // 如果死人了, 通知死人了
      getIO().to(room.roomNumber).emit(Events.SHOW_MSG, {
        innerHTML: renderHintNPlayers("猎人开枪射杀了", [
          shotByHunter.index,
        ]),
      } as ShowMsg);
      HunterCheckHandler.startOfState(room);
    }
  },
};

/**
 * 是否需要让大家等猎人开枪
 * 如果当前正在结算死亡的玩家不是猎人, 或者猎人开过枪, 或者无猎人都跳过此阶段
 */
function showHunter(room: Room): boolean {
  // 游戏中必须存在猎人身份
  if (!room.needingCharacters.includes("HUNTER")) return false;

  const hunter = room.players.find(
    (p) => p.character === "HUNTER"
  );

  if (!hunter) return false;

  // 猎人已经开过枪, 不再展示
  if (hunter.characterStatus?.shootAt?.player > 0) return false;

  // 仅当当前正在结算死亡的玩家是猎人时才进入此阶段
  // 否则直接跳过, 节省 ~25s 等待
  if (!room.curDyingPlayer) return false;
  if (room.curDyingPlayer.character !== "HUNTER") return false;
  if (room.curDyingPlayer._id !== hunter._id) return false;

  return true;
}
