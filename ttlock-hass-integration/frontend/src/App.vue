<template>
  <v-app>
    <v-app-bar color="blue" app dense>
      <v-app-bar-nav-icon v-on:click="goHome">
        <v-icon v-if="!isHome">mdi-arrow-left</v-icon>
        <v-icon v-else>mdi-square</v-icon>
      </v-app-bar-nav-icon>
      <v-toolbar-title>TTLock integration</v-toolbar-title>

      <v-spacer></v-spacer>
      <template v-if="isHome">
        <v-btn icon v-on:click="editConfig" :disabled="isScanning" title="Edit locks configuration file">
          <v-icon>mdi-puzzle-edit-outline</v-icon>
        </v-btn>
        <v-progress-circular v-if="isScanning" indeterminate color="primary"></v-progress-circular>
        <v-btn v-else icon v-on:click="startScan" title="Start BLE scan">
          <v-icon>mdi-sync</v-icon>
        </v-btn>
      </template>
      <template v-else-if="isCredentials">
        <v-progress-circular v-if="isWaitingCredentials" indeterminate color="primary"></v-progress-circular>
        <v-btn v-else icon v-on:click="refreshCredentials" title="Refresh credentials">
          <v-icon>mdi-sync</v-icon>
        </v-btn>
      </template>
    </v-app-bar>

    <v-main>
      <router-view></router-view>
      <ConfigDlg :show="showConfigDialog" v-on:cancel="hideConfigDialog"></ConfigDlg>
      <Errors></Errors>
    </v-main>
  </v-app>
</template>

<script>
import ConfigDlg from "@/components/ConfigDlg";
import Errors from "@/components/Errors";

export default {
  components: {
    ConfigDlg,
    Errors
  },
  data: function() {
    return {
      showConfigDialog: false
    }
  },
  computed: {
    ready() {
      return this.$store.state.ready;
    },
    startupStatusTxt() {
      const status = this.$store.state.startupStatus;
      switch (status) {
        case 0:
          return "Startup completed, all good";
        case 1:
          return "Startup completed, errors during startup";
        default:
          return "Starting ...";
      }
    },
    isHome() {
      return this.$route.name == "Home";
    },
    isCredentials() {
      return this.$route.name == "Credentials";
    },
    isSettings() {
      return this.$route.name == "Settings";
    },
    isScanning() {
      return this.$store.state.scanStatus == 1;
    },
    isWaitingCredentials() {
      return this.$store.state.waitingCredentials;
    },
    isWaitingAutoLock() {
      return this.$store.state.waitingAutoLock;
    },
  },
  methods: {
    goHome() {
      if (!this.isHome) {
        this.$router.push({
          name: "Home",
        });
      }
    },
    startScan() {
      this.$store.dispatch("scan");
    },
    refreshCredentials() {
      const address = this.$store.state.activeLockAddress;
      if (address != "") {
        this.$store.dispatch("readCredentials", address);
      }
    },
    editConfig() {
      this.showConfigDialog = true;
    },
    hideConfigDialog() {
      this.showConfigDialog = false;
    }
  },
};
</script>

<style>
@import url("https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap");
</style>
