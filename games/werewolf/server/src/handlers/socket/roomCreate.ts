import { Socket } from "socket.io";

import {
  CreateRoomRequest,
  CreateRoomResponse,
} from "@shared/httpMsg/CreateRoomMsg";
import { Player } from "../../models/PlayerModel";
import { Room } from "../../models/RoomModel";

type Ack = (res: any) => void;

/**
 * 创建房间（不需要鉴权，data 中带 name/password/characters）
 */
export default async function roomCreate(
  socket: Socket,
  data: CreateRoomRequest,
  ack: Ack
) {
  const { characters, name, password } = data;

  const creator = new Player({
    index: 1,
    name,
  });

  const room = new Room({
    creator: creator,
    needingCharacters: characters,
    password,
  });

  const ret: CreateRoomResponse = {
    status: 200,
    msg: "ok",
    data: {
      roomNumber: room.roomNumber,
      ID: creator._id,
    },
  };

  ack?.(ret);
}
