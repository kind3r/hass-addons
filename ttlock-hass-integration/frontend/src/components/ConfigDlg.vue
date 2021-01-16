<template>
  <v-row justify="center">
    <v-dialog v-model="show" persistent max-width="600px" transition="dialog-bottom-transition">
      <v-card>
        <v-card-title>
          <v-icon>mdi-puzzle-edit-outline</v-icon>
          <span class="headline">
            Edit locks configuration file
          </span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-jsoneditor ref="configEditor" v-model="config" :options="options" :plus="true" height="400px"></v-jsoneditor>
          </v-container>
          <v-progress-linear v-if="busy" indeterminate color="blue" class="mb-0"></v-progress-linear>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text v-on:click="cancelConfig" :disabled="busy"> Close </v-btn>
          <v-btn color="blue darken-1" text v-on:click="saveConfig" :disabled="busy || !configValid"> Save </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-row>
</template>
<script>
import VJsoneditor from "v-jsoneditor";

export default {
  name: "ConfigDlg",
  components: {
    VJsoneditor
  },
  props: ["show"],
  data: function () {
    return {
      busy: false,
      options: {
        mode: "code",
        onChange: this.onConfigChange
      },
      config: {},
      configValid: true
    };
  },
  computed: {
    storeConfig() {
      return this.$store.state.config;
    },
    waitingConfig() {
      return this.$store.state.waitingConfig;
    }
  },
  methods: {
    async saveConfig() {
      if (this.busy || !this.configValid) {
        return;
      }
      this.busy = true;
      await this.$store.dispatch("saveConfig", JSON.stringify(this.config));
    },
    cancelConfig() {
      this.$store.commit("setConfig", "");
      this.$emit("cancel");
    },
    onConfigChange() {
      console.log("Config changed");
      try {
        this.$refs.configEditor.editor.get();
        this.configValid = true;
      } catch (error) {
        this.configValid = false;
      }
    }
  },
  created() {
  },
  watch: {
    show(newVal) {
      if (newVal === true) {
        this.busy = true;
        this.$store.dispatch("loadConfig");
      }
    },
    storeConfig(newVal) {
      if (newVal != "") {
        this.config = JSON.parse(newVal);
        this.busy = false;
      }
    },
    waitingConfig(newVal) {
      if (newVal === false && this.busy === true) {
        this.$emit("cancel");
        this.busy = false;
      } 
    }
  },
};
</script>