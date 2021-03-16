<template>
  <v-form>
    <v-container>
      <h1>
        {{ lock.name }}
      </h1>
      <v-icon :title="lock.address">mdi-lan</v-icon>
      {{lock.address}}
      <v-row class="mt-4" v-if="lock && lock.hasPasscode && passcodes !== false">
        <v-col>
          <v-toolbar dense>
            <v-toolbar-title>
              <v-icon>mdi-gesture-tap</v-icon>
              Keyboard PIN
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <v-progress-circular v-if="passcodes == -1" indeterminate color="primary"></v-progress-circular>
            <v-btn color="primary" v-else v-on:click="showEditPasscodeDialog()">
              <v-icon>mdi-key-plus</v-icon>
              Add PIN
            </v-btn>
          </v-toolbar>
          <p v-if="passcodes == -1" class="text-center mt-4">Loading...</p>
          <v-simple-table v-else>
            <template v-slot:default>
              <thead>
                <tr>
                  <th class="text-left">Type</th>
                  <th class="text-left">PIN Code</th>
                  <th class="text-left">Valid from</th>
                  <th class="text-left">Valid to</th>
                  <th class="text-left">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="passcode of passcodes" :key="passcode.passCode">
                  <td>{{ passcodeTypeText[passcode.type] }}</td>
                  <td>
                    <strong>{{ passcode.passCode }}</strong>
                  </td>
                  <td>{{ dateTime(passcode.startDate) }}</td>
                  <td>{{ dateTime(passcode.endDate) }}</td>
                  <td class="text-right">
                    <v-btn class="mx-2" fab dark small elevation="1" color="blue" v-on:click="showEditPasscodeDialog(passcode)" title="Change PIN">
                      <v-icon dark> mdi-pencil </v-icon>
                    </v-btn>
                    <v-btn class="mx-2" fab dark small elevation="1" color="red" v-on:click="showDeletePasscodeDialog(passcode)" title="Delete PIN">
                      <v-icon dark> mdi-delete </v-icon>
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </template>
          </v-simple-table>
        </v-col>
      </v-row>
      <v-row class="mt-4" v-if="lock && lock.hasCard && cards !== false">
        <v-col>
          <v-toolbar dense>
            <v-toolbar-title>
              <v-icon>mdi-credit-card-wireless</v-icon>
              IC Cards
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <v-progress-circular v-if="cards == -1" indeterminate color="primary"></v-progress-circular>
            <v-btn color="primary" v-else v-on:click="showEditCardDialog()">
              <v-icon>mdi-key-plus</v-icon>
              Add Card
            </v-btn>
          </v-toolbar>
          <p v-if="cards == -1" class="text-center mt-4">Loading...</p>
          <v-simple-table v-else>
            <template v-slot:default>
              <thead>
                <tr>
                  <th class="text-left">Card S/N</th>
                  <th class="text-left">Valid from</th>
                  <th class="text-left">Valid to</th>
                  <th class="text-left">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="card of cards" :key="card.cardNumber">
                  <td v-if="card.alias != card.cardNumber">
                    <strong>{{ card.alias }}</strong><br />
                    <span class="text-caption">{{ card.cardNumber }}</span>
                  </td>
                  <td v-else>
                    <strong>{{ card.cardNumber }}</strong>
                  </td>
                  <td>{{ dateTime(card.startDate) }}</td>
                  <td>{{ dateTime(card.endDate) }}</td>
                  <td class="text-right">
                    <v-btn v-if="true" class="mx-2" fab dark small elevation="1" color="blue" v-on:click="showEditCardDialog(card)" title="Edit Card">
                      <v-icon dark> mdi-pencil </v-icon>
                    </v-btn>
                    <v-btn class="mx-2" fab dark small elevation="1" color="red" v-on:click="showDeleteCardDialog(card)" title="Delete Card">
                      <v-icon dark> mdi-delete </v-icon>
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </template>
          </v-simple-table>
        </v-col>
      </v-row>
      <v-row class="mt-4" v-if="lock && lock.hasFinger && fingers !== false">
        <v-col>
          <v-toolbar dense>
            <v-toolbar-title>
              <v-icon>mdi-fingerprint</v-icon>
              Fingerprints
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <v-progress-circular v-if="fingers == -1" indeterminate color="primary"></v-progress-circular>
            <v-btn color="primary" v-else v-on:click="showEditFingerDialog()">
              <v-icon>mdi-key-plus</v-icon>
              Add Fingerprint
            </v-btn>
          </v-toolbar>
          <p v-if="fingers == -1" class="text-center mt-4">Loading...</p>
          <v-simple-table v-else>
            <template v-slot:default>
              <thead>
                <tr>
                  <th class="text-left">Fingerprint ID</th>
                  <th class="text-left">Valid from</th>
                  <th class="text-left">Valid to</th>
                  <th class="text-left">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="finger of fingers" :key="finger.fpNumber">
                  <td v-if="finger.alias != finger.fpNumber">
                    <strong>{{ finger.alias }}</strong><br />
                    <span class="text-caption">{{ finger.fpNumber }}</span>
                  </td>
                  <td v-else>
                    <strong>{{ finger.fpNumber }}</strong>
                  </td>
                  <td>{{ dateTime(finger.startDate) }}</td>
                  <td>{{ dateTime(finger.endDate) }}</td>
                  <td class="text-right">
                    <v-btn class="mx-2" fab dark small elevation="1" color="blue" v-on:click="showEditFingerDialog(finger)" title="Edit Finger">
                      <v-icon dark> mdi-pencil </v-icon>
                    </v-btn>
                    <v-btn class="mx-2" fab dark small elevation="1" color="red" v-on:click="showDeleteFingerDialog(finger)" title="Delete Finger">
                      <v-icon dark> mdi-delete </v-icon>
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </template>
          </v-simple-table>
        </v-col>
      </v-row>
    </v-container>
    <Passcode :address="address" v-model="editPasscode" :show="showEditPasscode" v-on:cancel="cancelEditPasscodeDialog"></Passcode>
    <Card :address="address" v-model="editCard" :show="showEditCard" v-on:cancel="cancelEditCardDialog"></Card>
    <Finger :address="address" v-model="editFinger" :show="showEditFinger" v-on:cancel="cancelEditFingerDialog"></Finger>
    <ConfirmDlg ref="confirm" />
  </v-form>
</template>
<script>
import moment from "moment";
import Passcode from "@/components/Passcode";
import Card from "@/components/Card";
import Finger from "@/components/Finger";
import ConfirmDlg from "@/components/ConfirmDlg";

export default {
  name: "Credentials",
  params: ["address"],
  components: {
    Passcode,
    Card,
    Finger,
    ConfirmDlg,
  },
  data: function () {
    return {
      address: this.$route.params.address || this.address,
      passcodes: -1,
      cards: -1,
      fingers: -1,
      editPasscode: -1,
      showEditPasscode: false,
      editCard: -1,
      showEditCard: false,
      editFinger: -1,
      showEditFinger: false,
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
    waitingCredentials() {
      return this.$store.state.waitingCredentials;
    },
    passcodeTypeText() {
      return {
        1: "Permanent",
        2: "Count",
        3: "Timed",
        4: "Cyclic",
      };
    },
    autoLockChanged() {
      return this.autoLockTime != this.lock.autoLockTime;
    },
  },
  created() {
    if (typeof this.lock.name == "undefined") {
      this.$router.push({
        name: "Home",
      });
    } else {
      this.autoLockTime = this.lock.autoLockTime;
      this.$store.commit("setActiveLockAddress", this.lock.address);
      this.$store.dispatch("readCredentials", this.lock.address);
    }
  },
  beforeDestroy() {
    this.$store.commit("setActiveLockAddress", "");
  },
  methods: {
    dateTime(str) {
      return moment(str, "YYYYMMDDHHmm").format("DD-MM-YYYY HH:mm");
    },
    showEditPasscodeDialog(passcode) {
      if (typeof passcode != "undefined") {
        this.editPasscode = passcode;
      } else {
        this.editPasscode = -1;
      }
      this.showEditPasscode = true;
    },
    async showDeletePasscodeDialog(passcode) {
      if (typeof passcode != "undefined") {
        if (await this.$refs.confirm.open("Confirm", "Are you sure you want to delete this PIN ?")) {
          let p = JSON.parse(JSON.stringify(passcode));
          p.newPassCode = -1;
          this.$store.dispatch("setPasscode", {
            lockAddress: this.address,
            passcode: p,
          });
          this.passcodes = -1;
        }
      }
    },
    cancelEditPasscodeDialog() {
      this.editPasscode = -1;
      this.showEditPasscode = false;
    },
    showEditCardDialog(card) {
      if (typeof card != "undefined") {
        this.editCard = card;
      } else {
        this.editCard = -1;
      }
      this.showEditCard = true;
    },
    async showDeleteCardDialog(card) {
      if (typeof card != "undefined") {
        if (await this.$refs.confirm.open("Confirm", "Are you sure you want to delete this Card ?")) {
          card.startDate = -1;
          this.$store.dispatch("setCard", {
            lockAddress: this.address,
            card: card,
          });
          this.cards = -1;
        }
      }
    },
    cancelEditCardDialog() {
      this.editCard = -1;
      this.showEditCard = false;
    },
    showEditFingerDialog(finger) {
      if (typeof finger != "undefined") {
        this.editFinger = finger;
      } else {
        this.editFinger = -1;
      }
      this.showEditFinger = true;
    },
    async showDeleteFingerDialog(finger) {
      if (typeof finger != "undefined") {
        if (await this.$refs.confirm.open("Confirm", "Are you sure you want to delete this Fingerprint ?")) {
          finger.startDate = -1;
          this.$store.dispatch("setFinger", {
            lockAddress: this.address,
            finger: finger,
          });
          this.fingers = -1;
        }
      }
    },
    cancelEditFingerDialog() {
      this.editFinger = -1;
      this.showEditFinger = false;
    },
  },
  watch: {
    waitingCredentials(newVal) {
      if (newVal === false) {
        this.passcodes = this.$store.state.passcodes[this.address];
        this.cards = this.$store.state.cards[this.address];
        this.fingers = this.$store.state.fingers[this.address];
      } else {
        // this.passcodes = -1;
        // this.cards = -1;
        // this.fingers = -1;
      }
    },
  },
};
</script>