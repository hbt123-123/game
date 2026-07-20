import { Socket } from "socket.io";

import { getIO } from "../../../ws";
import { GameStatus, TIMEOUT } from "@shared/GameDefs";
import { index } from "@shared/ModelDefs";
import { Events } from "@shared/WSEvents";
import { ChangeStatusMsg } from "@shared/WSMsg/ChangeStatus";
import { Player } from "../../../models/PlayerModel";
import { Room } from "../../../models/RoomModel";
import { getVoteResult } from "../../../utils/getVoteResult";
import { GameActHandler, gotoNextStateAfterHandleDie, Response, startCurrentState } from "./";

export const SheriffAssignCheckHandler: GameActHandler = {
  curStatus: GameStatus.SHERIFF_ASSIGN_CHECK,

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

  startOfState(room: Room) {
    startCurrentState(this, room);
  },

  async endOfState(room: Room) {
    gotoNextStateAfterHandleDie(room);
  },
};
