import { Socket } from "socket.io";

import { JoinRoomRequest, JoinRoomResponse } from "@shared/httpMsg/JoinRoomMsg";
import { Events } from "@shared/WSEvents";
import { RoomJoinMsg } from "@shared/WSMsg/RoomJoin";
import { getIO } from "../../ws";
import { Room } from "../../models/RoomModel";

type Ack = (res: any) => void;

/**
 * 加入房间（不需要鉴权，data 中带 name/password/roomNumber）
 * 加入成功后向房间广播 ROOM_JOIN 事件
 */
export default async function roomJoin(
  socket: Socket,
  data: JoinRoomRequest,
  ack: Ack
) {
  const { name, password, roomNumber } = data;

  const room = Room.getRoom(roomNumber);
  const player = room.playerJoin(name, password);

  const ret: JoinRoomResponse = {
    status: 200,
    msg: "ok",
    data: {
      ID: player._id,
      index: player.index,
      needingCharacters: room.needingCharacters,
    },
  };

  // 加入 socket 房间，便于后续广播
  socket.join(roomNumber);

  // 通知房间内其他玩家有人加入
  const roomJoinMsg: RoomJoinMsg = room.choosePublicInfo();
  getIO().to(roomNumber).emit(Events.ROOM_JOIN, roomJoinMsg);

  ack?.(ret);
}
