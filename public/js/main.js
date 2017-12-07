new Vue({
  el: '#app',

  template: `
    <div id="main">
      <div id="msgContainer">
        <transition-group name="slide-in-fade" tag="p">
          <p v-for="(msg, i) of msgGroup" :key="i">{{ msg }}</p>
        </transition>
      </div>
      <div id="pauseBtn" @click="togglePause">{{ pauseBtnContent }}</div>
      <transition name="slide-out-fade">
        <div v-show="!autoScroll" id="toTopBtn" @click="toTop">^</div>
      </transition>
    </div>
  `,

  data() {
    return {
      mainDom: null,
      autoScroll: true,
      msgGroup: ['Welcome'],
    };
  },

  computed: {
    pauseBtnContent() {
      return this.autoScroll ? '||' : '>';
    },
  },

  mounted() {
    this.mainDom = document.getElementById('msgContainer');
    const socket = io.connect();
    socket.on('connect', () => {
      this.appendMsg('Socket connected');
    });
    socket.on('msg', this.appendMsg);
  },

  updated() {
    if (this.autoScroll) this.mainDom.scrollIntoView(false);
    if (this.msgGroup.length >= 1000) {
      this.msgGroup.shift();
    }
  },

  methods: {
    appendMsg(msg) {
      this.msgGroup.push(msg);
    },
    togglePause() {
      this.autoScroll = !this.autoScroll;
    },
    toTop() {
      this.mainDom.scrollIntoView();
    }
  },
});
