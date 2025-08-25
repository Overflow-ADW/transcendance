<template>
  <div>

    <h3>Pong</h3>
    <canvas></canvas>

  </div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import { Pong as PongGame} from '@/game/pong/game/Pong';

@Options({
  props: {
    msg: String
  }
})
export default class Pong extends Vue {
    mounted(): void {  
        const canvas = document.querySelector("canvas")!;
        new PongGame(canvas);
    }
  msg!: string
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
canvas{
    width: 70%;
    height: 50%;
}
</style>
