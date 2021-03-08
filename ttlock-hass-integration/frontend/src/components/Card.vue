<template>
  <v-row justify="center">
    <v-dialog v-model="show" persistent max-width="600px" transition="dialog-bottom-transition">
      <v-card>
        <v-card-title>
          <v-icon>mdi-credit-card-wireless</v-icon>
          <span class="headline">
            <template v-if="value == -1">Add</template>
            <template v-else>Edit</template>
            Card
          </span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12" class="mb-3">
                <v-text-field hint="A name so you can identify this card" persistent-hint prepend-icon="mdi-label" label="Alias" v-model="alias"></v-text-field>
              </v-col>
            </v-row>
            <v-row no-gutters>
              <v-col cols="6" sm="3">
                <v-menu v-model="startDateMenu" :close-on-content-click="false" :nudge-right="40" transition="scale-transition" offset-y min-width="290px">
                  <template v-slot:activator="{ on, attrs }">
                    <v-text-field v-model="startDate" label="Valid from" prepend-icon="mdi-calendar" readonly v-bind="attrs" v-on="on"></v-text-field>
                  </template>
                  <v-date-picker v-model="startDate" @input="startDateMenu = false"></v-date-picker>
                </v-menu>
              </v-col>
              <v-col cols="6" sm="2">
                <v-menu
                  ref="startTimeMenu"
                  v-model="startTimeMenu"
                  :close-on-content-click="false"
                  :nudge-right="40"
                  :return-value.sync="startTime"
                  transition="scale-transition"
                  offset-y
                  max-width="290px"
                  min-width="290px"
                >
                  <template v-slot:activator="{ on, attrs }">
                    <v-text-field v-model="startTime" label="Time" prepend-icon="mdi-clock-time-four-outline" readonly v-bind="attrs" v-on="on"></v-text-field>
                  </template>
                  <v-time-picker v-model="startTime" full-width format="24hr" @click:minute="$refs.startTimeMenu.save(startTime)"></v-time-picker>
                </v-menu>
              </v-col>
              <v-spacer></v-spacer>
              <v-col cols="6" sm="3">
                <v-menu v-model="endDateMenu" :close-on-content-click="false" :nudge-right="40" transition="scale-transition" offset-y min-width="290px">
                  <template v-slot:activator="{ on, attrs }">
                    <v-text-field v-model="endDate" label="Valid to" prepend-icon="mdi-calendar" readonly v-bind="attrs" v-on="on"></v-text-field>
                  </template>
                  <v-date-picker v-model="endDate" @input="endDateMenu = false"></v-date-picker>
                </v-menu>
              </v-col>
              <v-col cols="6" sm="2">
                <v-menu
                  ref="endTimeMenu"
                  v-model="endTimeMenu"
                  :close-on-content-click="false"
                  :nudge-right="40"
                  :return-value.sync="endTime"
                  transition="scale-transition"
                  offset-y
                  max-width="290px"
                  min-width="290px"
                >
                  <template v-slot:activator="{ on, attrs }">
                    <v-text-field v-model="endTime" label="Time" prepend-icon="mdi-clock-time-four-outline" readonly v-bind="attrs" v-on="on"></v-text-field>
                  </template>
                  <v-time-picker v-model="endTime" full-width format="24hr" @click:minute="$refs.endTimeMenu.save(endTime)"></v-time-picker>
                </v-menu>
              </v-col>
            </v-row>
          </v-container>
          <v-progress-linear v-if="busy" indeterminate color="blue" class="mb-0"></v-progress-linear>
          <v-alert v-if="lockIsScanning" class="mt-4" color="blue" type="info">Please scan your card</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text v-on:click="$emit('cancel')" :disabled="busy"> Close </v-btn>
          <v-btn color="blue darken-1" text v-on:click="saveCard" :disabled="busy"> Save </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-row>
</template>
<script>
import moment from "moment";

export default {
  name: "Card",
  props: ["show", "address", "value"],
  data: function () {
    return {
      card: {},
      startDateMenu: false,
      startDate: "",
      startTimeMenu: false,
      startTime: "",
      endDateMenu: false,
      endDate: "",
      endTimeMenu: false,
      endTime: "",
      alias: "",
      busy: false,
    };
  },
  computed: {
    storeIsWaiting() {
      return this.$store.state.waitingCredentials;
    },
    lockIsScanning() {
      return this.$store.state.waitingCardScan;
    },
  },
  methods: {
    updateCard(card) {
      if (card == -1) {
        this.card = {
          cardNumber: -1,
          startDate: "200001010000",
          endDate: "209912012359",
          alias: ""
        };
      } else {
        this.card = JSON.parse(JSON.stringify(card));
      }
    },
    async saveCard() {
      if (this.busy) return;
      this.busy = true;
      this.card.startDate = this.startDate.split("-").join("") + this.startTime.split(":").join("");
      this.card.endDate = this.endDate.split("-").join("") + this.endTime.split(":").join("");
      this.card.alias = this.alias;
      await this.$store.dispatch("setCard", {
        lockAddress: this.address,
        card: this.card,
      });
      // succesfull result will refresh passcodes and close the dialog via watch
    },
  },
  created() {
    this.updateCard(this.value);
  },
  watch: {
    value(newVal) {
      this.updateCard(newVal);
    },
    storeIsWaiting(newVal) {
      if (newVal === false && this.busy) {
        this.$emit("cancel");
        this.busy = false;
      }
    },
    card(newVal) {
      const startDate = moment(newVal.startDate, "YYYYMMDDHHmm");
      this.startDate = startDate.format("YYYY-MM-DD");
      this.startTime = startDate.format("HH:mm");
      const endDate = moment(newVal.endDate, "YYYYMMDDHHmm");
      this.endDate = endDate.format("YYYY-MM-DD");
      this.endTime = endDate.format("HH:mm");
      this.alias = newVal.alias;
    },
  },
};
</script>