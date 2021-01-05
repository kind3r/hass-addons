<template>
  <v-card :loading="busy">
    <v-card-title>
      {{ lock.name }}
      <v-spacer></v-spacer>
      {{ lock.battery }}%
      <v-icon>mdi-battery-80-bluetooth</v-icon>
    </v-card-title>
    <v-card-text>
      <p title="MAC Address"><v-icon>mdi-lan</v-icon> {{ lock.address }}</p>
      <p title="RSSI Signal strength">
        <v-icon>mdi-signal</v-icon>
        {{ lock.rssi }}dB
      </p>
      <p title="Auto lock time">
        <v-icon>mdi-lock-clock</v-icon>
        {{ lock.autoLockTime }}s
      </p>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn v-if="canLock" v-on:click="lockLock" :disabled="busy" color="primary">
        <v-icon left>mdi-lock</v-icon>
        Lock
      </v-btn>
      <v-btn v-if="canUnlock" v-on:click="unlockLock" :disabled="busy" color="primary">
        <v-icon left>mdi-lock-open-variant</v-icon>
        Unlock
      </v-btn>
      <v-btn v-if="canPair" :disabled="busy" v-on:click="pairLock" color="secondary">
        <v-icon left>mdi-link-variant</v-icon>
        Pair
      </v-btn>
      <v-btn v-if="!canPair" :disabled="busy" v-on:click="settings">
        <v-icon left>mdi-cog</v-icon>
        Settings
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
export default {
  props: ["lock"],
  components: {},
  data: function () {
    return {
      busy: false,
    };
  },
  computed: {
    canLock() {
      if (this.lock.paired && this.lock.locked == 1) {
        return true;
      }
      return false;
    },
    canUnlock() {
      if (this.lock.paired && this.lock.locked == 0) {
        return true;
      }
      return false;
    },
    canPair() {
      return !this.lock.paired;
    },
    waiting() {
      return this.$store.state.waiting;
    },
  },
  methods: {
    async unlockLock() {
      if (this.busy) return;
      this.busy = true;
      try {
        await this.$store.dispatch("unlock", this.lock.address);
      } catch (error) {
        console.error(error);
      }
      // this.busy = false;
    },
    async lockLock() {
      if (this.busy) return;
      this.busy = true;
      try {
        await this.$store.dispatch("lock", this.lock.address);
      } catch (error) {
        console.error(error);
      }
      // this.busy = false;
    },
    async pairLock() {
      if (this.busy) return;
      this.busy = true;
      try {
        await this.$store.dispatch("pair", this.lock.address);
      } catch (error) {
        console.error(error);
      }
      // this.busy = false;
    },
    settings() {
      this.$router.push({
        name: "Settings",
        params: {
          address: this.lock.address
        }
      });
    },
  },
  watch: {
    waiting(newVal) {
      if (!newVal) {
        this.busy = false;
      }
    },
  },
};
</script>
