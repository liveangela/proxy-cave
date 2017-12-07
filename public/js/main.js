new Vue({
  el: '#app',

  template: `
    <div class="main">
      <p v-for="msg of msgGroup">{{ msg }}</p>
    </div>
  `,

  data() {
    return {
      msgGroup: ['Welcome'],
    };
  },

  mounted() {
    const socket = io.connect();
    socket.on('connect', () => {
      this.appendMsg('Socket connected');
    });
    socket.on('msg', this.appendMsg);
  },

  methods: {
    appendMsg(msg) {
      this.msgGroup.push(msg);
    },
  },
});
