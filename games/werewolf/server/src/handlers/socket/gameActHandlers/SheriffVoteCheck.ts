import { Socket } from "socket.io";

import { getIO } from "../../../ws";
import { GameStatus, TIMEOUT } from "@shared/GameDefs";
import { index } from "@shared/ModelDefs";
import { Events } from "@shared/WSEvents";
import { ChangeStatusMsg } from "@shared/WSMsg/ChangeStatus";
import { Player } from "../../../models/PlayerModel";
import { Room } from "../../../models/RoomModel";
import { getVoteResult } from "../../../utils/getVoteResult";
import { GameActHandler, Response, startCurrentState } from "./";
import { BeforeDayDiscussHandler } from "./BeforeDayDiscuss";

export const SheriffVoteCheckHandler: GameActHandler = {
  curStatus: GameStatus.SHERIFF_VOTE_CHECK,

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
    BeforeDayDiscussHandler.startOfState(room);
  },
};
