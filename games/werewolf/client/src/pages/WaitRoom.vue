<template>
  <div class="waitroom">
    <RoomPlayerList :playerList="playerList"></RoomPlayerList>
    <div class="room-number">房间号：{{ number }}</div>
    <div id="qr-code"></div>
    <Btn
      @click="beginGame"
      v-if="self.index === 1"
      content="开始游戏"
      class="wait-btn"
      :disabled="!canBegin"
    ></Btn>
    <Btn
      class="wait-btn"
      @click="showDialog('暂未实现')"
      content="查看规则"
    ></Btn>
  </div>
</template>

<script lang="ts">
  import {
    defineComponent,
    toRefs,
    onMounted,
    computed,
  } from "vue";
  import QRCode from "easyqrcodejs";

  import { CLIENT_BASE_URL } from "@shared/constants";
  import { InitRoomResponse } from "@shared/httpMsg/InitRoomMsg";
  import RoomPlayerList from "../components/RoomPlayerList.vue";
  import Btn from "../components/Btn.vue";
  import { showDialog } from "../reactivity/dialog";
  import {
    needingCharacters,
    refresh,
    self,
    players,
  } from "../reactivity/game";
  import { Events } from "../socket";
  import { emitWithAck } from "../socket/emit";

  const WaitRoom = defineComponent({
    name: "WaitRoom",
    components: { RoomPlayerList, Btn },
    props: {
      pw: { type: String, required: false },
      number: { type: String, required: true },
    },
    setup(props) {
      const { pw, number } = toRefs(props);
      onMounted(async () => {
        new QRCode(document.getElementById("qr-code"), {
          text: `${CLIENT_BASE_URL}/joinRoom?pw=${
            pw && pw.value
          }&number=${number && number.value}`,
          logo: "/werewolf/assets/wolf.png",
          logoWidth: 20,
          logoHeight: 20,
          width: 100,
          height: 100,
        });
        const res = await emitWithAck<InitRoomResponse["data"]>(
          Events.ROOM_INIT,
          {}
        );
        if (res) {
          players.value = res.data.players;
          needingCharacters.value = res.data.needingCharacters;
        }
        refresh();
      });

      const playerList = computed(() => {
        return new Array(needingCharacters.value.length)
          .fill(0)
          .map(
            (_, ind) =>
              players.value.find(
                (player) => player.index === ind + 1
              ) || {
                index: ind + 1,
              }
          );
      });

      const canBegin = computed(
        () =>
          needingCharacters.value.length === players.value.length
      );

      async function beginGame() {
        const res = await emitWithAck(Events.GAME_BEGIN_REQ, {});
        if (res) {
          // 等待 GAME_BEGIN 广播触发页面跳转
        }
      }

      return { showDialog, playerList, self, beginGame, canBegin };
    },
  });

  export default WaitRoom;
</script>

<style lang="scss" scoped>
  .waitroom {
    #qr-code {
      margin: 5vh auto;
      width: min-content;
    }
    .room-number {
      font-weight: bold;
      font-size: 1.6rem;
      text-align: center;
    }
    .btn {
      display: block;
      text-align: center;
      margin: 1rem;
    }
  }
</style>
