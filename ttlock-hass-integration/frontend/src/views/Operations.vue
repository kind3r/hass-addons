<template>
  <v-form>
    <v-container v-if="lock">
      <h1>
        {{ lock.name }}
      </h1>
      <v-icon :title="lock.address">mdi-lan</v-icon>
      {{ lock.address }}
      <v-row class="mt-4 mb-4">
        <v-col>
          <v-data-table :headers="headers" :items="sortedOperations" class="elevation-1" :loading="waitingOperations">
            <template v-slot:item.recordTypeCategory="{ item }">
              <v-icon left v-if="item.recordTypeCategory == 'LOCK'">mdi-lock</v-icon>
              <v-icon left v-else-if="item.recordTypeCategory == 'UNLOCK'">mdi-lock-open-variant</v-icon>
            </template>
            <template v-slot:item.operateDate="{ item }">
              {{ dateTime(item.operateDate) }}
            </template>
            <template v-slot:item.electricQuantity="{ item }">
              {{ item.electricQuantity }}%
              <v-icon v-if="item.electricQuantity > 90">mdi-battery-bluetooth</v-icon>
              <v-icon v-else-if="item.electricQuantity > 80">mdi-battery-90-bluetooth</v-icon>
              <v-icon v-else-if="item.electricQuantity > 70">mdi-battery-80-bluetooth</v-icon>
              <v-icon v-else-if="item.electricQuantity > 60">mdi-battery-70-bluetooth</v-icon>
              <v-icon v-else-if="item.electricQuantity > 50">mdi-battery-60-bluetooth</v-icon>
              <v-icon v-else-if="item.electricQuantity > 40">mdi-battery-50-bluetooth</v-icon>
              <v-icon v-else-if="item.electricQuantity > 30">mdi-battery-40-bluetooth</v-icon>
              <v-icon v-else-if="item.electricQuantity > 20">mdi-battery-30-bluetooth</v-icon>
              <v-icon v-else color="red">mdi-battery-alert-bluetooth</v-icon>
            </template>
            <template v-slot:item.password="{ item }">
              <strong v-if="item.passwordName">
                {{ item.passwordName }}
              </strong>
              <br />
              <small v-if="item.password">
                {{ item.password }}
              </small>
            </template>
          </v-data-table>
        </v-col>
      </v-row>
    </v-container>
  </v-form>
</template>
<script>
import moment from "moment";

export default {
  name: "Operations",
  params: ["address"],
  data: function () {
    return {
      address: this.$route.params.address || this.address,
      operations: [],
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
    waitingOperations() {
      return this.$store.state.waitingOperations;
    },
    headers() {
      return [
        {
          text: "#",
          value: "recordNumber"
        },
        {
          text: "",
          value: "recordTypeCategory",
          sortable: false,
        },
        {
          text: "Date",
          value: "operateDate"
        },
        {
          text: "Battery",
          value: "electricQuantity",
          sortable: false,
        },
        {
          text: "Credential",
          value: "password",
          sortable: false,
        },
        {
          text: "Description",
          value: "recordTypeName",
          sortable: false,
        }
      ]
    },
    sortedOperations() {
      let sorted = JSON.parse(JSON.stringify(this.operations));
      sorted.sort((a, b) => {
        if (a.operateDate > b.operateDate) {
          return -1;
        } else if (a.operateDate < b.operateDate) {
          return 1;
        } else if (a.recordNumber > b.recordNumber) {
          return -1;
        } else if (a.recordNumber < b.recordNumber) {
          return 1;
        }
        return 0;
      });
      return sorted;
    },
  },
  created() {
    if (typeof this.lock.name == "undefined") {
      this.$router.push({
        name: "Home",
      });
    } else {
      this.$store.commit("setActiveLockAddress", this.lock.address);
      this.$store.dispatch("readOperations", this.lock.address);
    }
  },
  beforeDestroy() {
    this.$store.commit("setActiveLockAddress", "");
  },
  methods: {
    dateTime(str) {
      return moment(str, "YYYYMMDDHHmm").format("DD-MM-YYYY HH:mm");
    },
  },
  watch: {
    waitingOperations(newVal) {
      if (newVal === false) {
        this.operations = this.$store.state.operations[this.address];
      }
    },
  },
};
</script>
