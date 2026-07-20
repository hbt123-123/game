import { Socket } from "socket.io";

import { GameStatus, TIMEOUT } from "@shared/GameDefs";
import { index } from "@shared/ModelDefs";
import { Events } from "@shared/WSEvents";
import { ChangeStatusMsg } from "@shared/WSMsg/ChangeStatus";
import { Player } from "../../../models/PlayerModel";
import { Room } from "../../../models/RoomModel";
import { checkGameOver } from "../../../utils/checkGameOver";
import { GameActHandler, Response, startCurrentState, status2Handler } from "./";

export const ExileVoteCheckHandler: GameActHandler = {
  curStatus: GameStatus.EXILE_VOTE_CHECK,

  async handleHttpInTheState(
    room: Room,
    player: Player,
    target: index,
    socket: Socket
  ) {
    return {
      status: 200,
      msg: "ok",
      data: { target },
    };
  },
  /**
   * @param nextState 在确认完结果后进入哪个状态
   */
  startOfState: function (room: Room, nextState: GameStatus) {
    startCurrentState(this, room, nextState);
  },
  /**
   * @param nextState 在确认完结果后进入哪个状态
   */
  async endOfState(room: Room, nextState: GameStatus) {
    // 提前判定游戏是否已结束（例如放逐投票后狼人归零）
    // 避免走完 LEAVE_MSG / HUNTER_SHOOT / SHERIFF_ASSIGN 等长链才触发 GAME_END
    if (checkGameOver(room)) return;
    status2Handler[nextState].startOfState(room);
  },
};
