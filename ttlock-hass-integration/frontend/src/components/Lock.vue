<template>
  <v-card :loading="busy">
    <v-card-title>
      {{ lock.name }}
      <v-spacer></v-spacer>
      <span class="subtitle-2">
        <v-icon v-if="lock.battery > 90">mdi-battery-bluetooth</v-icon>
        <v-icon v-else-if="lock.battery > 80">mdi-battery-90-bluetooth</v-icon>
        <v-icon v-else-if="lock.battery > 70">mdi-battery-80-bluetooth</v-icon>
        <v-icon v-else-if="lock.battery > 60">mdi-battery-70-bluetooth</v-icon>
        <v-icon v-else-if="lock.battery > 50">mdi-battery-60-bluetooth</v-icon>
        <v-icon v-else-if="lock.battery > 40">mdi-battery-50-bluetooth</v-icon>
        <v-icon v-else-if="lock.battery > 30">mdi-battery-40-bluetooth</v-icon>
        <v-icon v-else-if="lock.battery > 20">mdi-battery-30-bluetooth</v-icon>
        <v-icon v-else color="red">mdi-battery-alert-bluetooth</v-icon>
        {{ lock.battery }}%
      </span>
      <v-spacer></v-spacer>
      <span class="subtitle-2">
        <v-icon v-if="lock.rssi < -86" color="red">mdi-signal-cellular-outline</v-icon>
        <v-icon v-else-if="lock.rssi < -80">mdi-signal-cellular-1</v-icon>
        <v-icon v-else-if="lock.rssi < -70">mdi-signal-cellular-2</v-icon>
        <v-icon v-else>mdi-signal-cellular-3</v-icon>
        {{ lock.rssi }}dB
      </span>
    </v-card-title>
    <v-card-text>
      <v-row no-gutters>
        <v-col class="text-center" title="Auto lock time"><v-icon>mdi-lock-clock</v-icon> {{ lock.autoLockTime }}s</v-col>
        <v-col class="text-center" title="Sound">
          <template v-if="lock.hasAudio">
            <template v-if="lock.audio"> <v-icon>mdi-volume-high</v-icon> on </template>
            <template v-else><v-icon>mdi-volume-off</v-icon> off</template>
          </template>
          <template v-else> &nbsp; </template>
        </v-col>
      </v-row>
      <v-row class="mt-4 mb-4">
        <v-col class="text-center">
          <v-btn v-if="canLock" v-on:click="lockLock" :disabled="waiting" color="primary"  x-large>
            <v-icon left>mdi-lock</v-icon>
            Lock
          </v-btn>
          <v-btn v-if="canUnlock" v-on:click="unlockLock" :disabled="waiting" color="primary" x-large>
            <v-icon left>mdi-lock-open-variant</v-icon>
            Unlock
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn v-if="canPair" :disabled="waiting" v-on:click="pairLock" color="secondary">
        <v-icon left>mdi-link-variant</v-icon>
        Pair
      </v-btn>
      <v-btn v-if="!canPair" :disabled="waiting" v-on:click="credentials">
        <v-icon left>mdi-key-chain</v-icon>
        Credentials
      </v-btn>
      <v-btn v-if="!canPair" :disabled="waiting" v-on:click="settings">
        <v-icon left>mdi-cog</v-icon>
        Settings
      </v-btn>
    </v-card-actions>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn v-if="!canPair" :disabled="waiting" v-on:click="operations">
        <v-icon left>mdi-history</v-icon>
        Operation log
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
      return this.$store.state.waiting || this.$store.state.waitingCredentials || this.$store.state.scanStatus == 1;
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
    credentials() {
      this.$router.push({
        name: "Credentials",
        params: {
          address: this.lock.address,
        },
      });
    },
    settings() {
      this.$router.push({
        name: "Settings",
        params: {
          address: this.lock.address,
        },
      });
    },
    operations() {
      this.$router.push({
        name: "Operations",
        params: {
          address: this.lock.address,
        },
      });
    }
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
