import { Character, GameStatus, TIMEOUT } from "@shared/GameDefs";
import { ChangeStatusMsg } from "@shared/WSMsg/ChangeStatus";
import { showDialog } from "../reactivity/dialog";
import { date, gameStatus, gameStatusTimeLeft, refresh, self } from "../reactivity/game";
import { emitWithAck } from "./emit";
import { Events } from "./index";

export default async function changeStatus(msg: ChangeStatusMsg) {
  // console.log("# changeStatus", { msg });
  date.value = msg.setDay;
  gameStatus.value = msg.setStatus;

  gameStatusTimeLeft.value = msg.timeout || TIMEOUT[msg.setStatus];

  await refresh();

  if (
    msg.setStatus === GameStatus.WOLF_KILL_CHECK &&
    self.value.character === "WEREWOLF"
  ) {
    const res = await emitWithAck<string>(Events.HINT_WOLF_KILL);
    if (res) showDialog(res.data);
  } else if (
    msg.setStatus === GameStatus.WOLF_KILL &&
    self.value.character === "WEREWOLF"
  ) {
    const res = await emitWithAck<string>(Events.HINT_GET_WOLFS);
    if (res) showDialog(res.data);
  } else if (
    msg.setStatus === GameStatus.WITCH_ACT &&
    self.value.character === "WITCH"
  ) {
    const res = await emitWithAck<string>(Events.HINT_WITCH_GET_DIE);
    if (res) showDialog(res.data);
  }
}
