import { HttpRes } from "@shared/httpMsg/_httpResTemplate";
import { getSocket } from "./index";
import { showDialog } from "../reactivity/dialog";

/**
 * 以 ack 回调模式发送 socket 事件，返回服务端响应
 * @param event 事件名
 * @param data 负载数据
 * @returns 服务端响应；若 socket 未初始化或服务端返回非 200，则返回 null
 */
export function emitWithAck<T = any>(
  event: string,
  data?: any
): Promise<HttpRes<T> | null> {
  return new Promise((resolve) => {
    const socket = getSocket();
    if (!socket) {
      console.error("[emitWithAck] socket 未初始化");
      return resolve(null);
    }
    socket.emit(event, data, (res: HttpRes<T>) => {
      if (res && res.status !== 200) {
        if (res.msg) {
          showDialog(res.msg);
        }
        return resolve(null);
      }
      resolve(res);
    });
  });
}
