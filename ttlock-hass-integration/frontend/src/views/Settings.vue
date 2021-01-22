<template>
  <v-form>
    <v-container v-if="lock">
      <h1>
        {{ lock.name }}
      </h1>
      <v-icon :title="lock.address">mdi-lan</v-icon>
      {{lock.address}}
      <v-row class="mt-4 mb-4">
        <v-col sm="6" cols="12">
          <v-slider
            v-model="autoLockTime"
            :disabled="!lock.hasAutoLock"
            class="align-center"
            prepend-icon="mdi-lock-clock"
            thumb-label="always"
            label="Auto lock time"
            :hint="autoLockHint"
            persistent-hint
            max="60"
            min="0"
          >
          </v-slider>
        </v-col>
        <v-col sm="6" cols="12">
          <v-switch
            v-model="audio"
            class="mt-0"
            prepend-icon="mdi-volume-high"
            label="Sound"
            persistent-hint
            hint="Enables or disables the very anyoing beep when pressing keys or unlocking"
            inset
          >
          </v-switch>
        </v-col>
      </v-row>
      <v-row class="mt-4">
        <v-col class="text-center">
          <v-btn v-on:click="cancel" text>Cancel</v-btn>
        </v-col>
        <v-col class="text-center">
          <v-btn color="primary" text :disabled="!changesMade" :loading="waitingSettings" v-on:click="saveSettings"> Save </v-btn>
        </v-col>
      </v-row>
    </v-container>
  </v-form>
</template>
<script>
import moment from "moment";

export default {
  name: "Settings",
  params: ["address"],
  data: function () {
    return {
      address: this.$route.params.address || this.address,
      autoLockTime: -1,
      audio: false,
    };
  },
  computed: {
    lock() {
      const locks = this.$store.state.locks;
      // no concern for perfomance here as we are not planning on managing a hole building
      for (const lock of locks) {
        if (lock.address == this.address) {
          return lock;
        }
      }
      return {};
    },
    waitingSettings() {
      return this.$store.state.waitingSettings;
    },
    autoLockHint() {
      if (this.lock.hasAutoLock) {
        return "Current value: " + this.lock.autoLockTime + " seconds (set to 0 to disable)";
      } else {
        return "Lock does not support auto lock";
      }
    },
    autoLockChanged() {
      return this.autoLockTime != this.lock.autoLockTime;
    },
    audioChanged() {
      return this.audio != this.lock.audio;
    },
    changesMade() {
      if (this.autoLockChanged || this.audioChanged) {
        return true;
      }
      return false;
    },
  },
  created() {
    if (typeof this.lock.name == "undefined") {
      this.$router.push({
        name: "Home",
      });
    } else {
      this.autoLockTime = this.lock.autoLockTime;
      this.audio = this.lock.audio;
      this.$store.commit("setActiveLockAddress", this.lock.address);
    }
  },
  beforeDestroy() {
    this.$store.commit("setActiveLockAddress", "");
  },
  methods: {
    dateTime(str) {
      return moment(str, "YYYYMMDDHHmm").format("DD-MM-YYYY HH:mm");
    },
    cancel() {
      this.$router.push({
        name: "Home",
      });
    },
    saveSettings() {
      let settings = {};
      if (this.autoLockChanged) {
        settings.autolock = this.autoLockTime;
      }
      if (this.audioChanged) {
        settings.audio = this.audio;
      }
      this.$store.dispatch("saveSettings", {
        lockAddress: this.lock.address,
        settings: settings,
      });
    },
  },
  watch: {},
};
</script>