<template>
  <v-row justify="center">
    <v-dialog v-model="show" persistent max-width="600px" transition="dialog-bottom-transition">
      <v-card>
        <v-card-title>
          <v-icon>mdi-gesture-tap</v-icon>
          <span class="headline">
            <template v-if="value == -1">Add</template>
            <template v-else>Edit</template>
            PIN Code
          </span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12" sm="6">
                <v-select v-model="passcode.type" :items="passcodeTypes"></v-select>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="passcode.newPassCode" label="PIN Code" hint="4 to 9 digits"></v-text-field>
              </v-col>
            </v-row>
          </v-container>
          <v-progress-linear v-if="busy" indeterminate color="blue" class="mb-0"></v-progress-linear>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text v-on:click="$emit('cancel')" :disabled="busy"> Close </v-btn>
          <v-btn color="blue darken-1" text v-on:click="savePasscode" :disabled="busy"> Save </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-row>
</template>
<script>
export default {
  name: "Passcode",
  props: ["show", "address", "value"],
  data: function () {
    return {
      passcode: {},
      busy: false,
    };
  },
  computed: {
    passcodeTypes() {
      return [
        {
          text: "Permanent",
          value: 1,
        },
        {
          text: "Count",
          value: 2,
          disabled: true,
        },
        {
          text: "Timed",
          value: 3,
          disabled: true,
        },
        {
          text: "Cyclic",
          value: 4,
          disabled: true,
        },
      ];
    },
    storeIsWaiting() {
      return this.$store.state.waitingCredentials;
    },
  },
  methods: {
    updatePasscode(passcode) {
      if (passcode == -1) {
        this.passcode = {
          type: 1,
          newPassCode: "",
          passCode: -1,
          startDate: "200001010000",
          endDate: "209912012359",
        };
      } else {
        this.passcode = JSON.parse(JSON.stringify(passcode));
        this.passCode.endDate = "209912012359";
      }
    },
    async savePasscode() {
      if (this.busy) return;
      this.busy = true;
      await this.$store.dispatch("setPasscode", {
        lockAddress: this.address,
        passcode: this.passcode,
      });
      // succesfull result will refresh passcodes and close the dialog via watch
    },
  },
  created() {
    this.updatePasscode(this.value);
  },
  watch: {
    value(newVal) {
      this.updatePasscode(newVal);
    },
    storeIsWaiting(newVal) {
      if (newVal === false && this.busy) {
        this.$emit("cancel");
        this.busy = false;
      }
    },
  },
};
</script>