/**
 * 工具函数：抛出带 status/msg 的结构化错误
 * ws.ts 的 runHandler 会捕获并解析 err.message（JSON 字符串）通过 ack 返回客户端
 */
export function createError({
  status,
  msg,
}: {
  status: number;
  msg: string;
}): undefined {
  throw new Error(
    JSON.stringify({
      status,
      msg,
    })
  );
}
