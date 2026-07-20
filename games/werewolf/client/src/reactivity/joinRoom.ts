import sha256 from "sha256";
import { ref } from "vue";

import { JoinRoomRequest, JoinRoomResponse } from "@shared/httpMsg/JoinRoomMsg";
import router from "../router";
import { connectAndAuth, Events } from "../socket";
import { emitWithAck } from "../socket/emit";
import { setToken } from "../utils/token";
import { showDialog } from "./dialog";
import { needingCharacters } from "./game";

export const password = ref("");
export const roomNumber = ref("");
export const nickname = ref("");

export async function join() {
  if (!roomNumber.value) return showDialog("请填写房间号");
  if (!nickname.value) return showDialog("请填写昵称");

  const req: JoinRoomRequest = {
    roomNumber: roomNumber.value,
    name: nickname.value,
    password: password.value ? sha256(password.value) : undefined,
  };
  const res = await emitWithAck<JoinRoomResponse["data"]>(
    Events.ROOM_JOIN_REQ,
    req
  );

  if (res) {
    setToken(res.data.ID, roomNumber.value);

    /* 连接 socket 并鉴权 */
    await connectAndAuth();

    showDialog("成功加入房间!");
    needingCharacters.value = res.data.needingCharacters;
    router.push({
      name: "waitRoom",
      query: {
        pw: password.value,
        number: roomNumber.value,
      },
    });
  }
}

export function gameBegin() {
  /* 清空以前的备忘录 */
  localStorage.removeItem("memo");
  showDialog("游戏开始, 天黑请闭眼👁️");
  setTimeout(() => {
    router.push({
      name: "play",
    });
  }, 500);
}
