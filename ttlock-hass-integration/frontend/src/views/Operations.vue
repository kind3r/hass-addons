<template>
  <v-form>
    <v-container v-if="lock">
      <h1>
        {{ lock.name }}
      </h1>
      <v-icon :title="lock.address">mdi-lan</v-icon>
      {{ lock.address }}
      <p v-if="waitingOperations">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
        Reading operation log
      </p>
      <v-row class="mt-4 mb-4" v-else>
        <v-simple-table>
          <template v-slot:default>
            <thead>
              <tr>
                <th class="text-left">#</th>
                <th class="text-left">&nbsp;</th>
                <th class="text-left">Date</th>
                <th class="text-left">Battery</th>
                <th class="text-left">Credential</th>
                <th class="text-left">Description</th>
                <!-- <th class="text-left">Full</th> -->
              </tr>
            </thead>
            <tbody>
              <tr v-for="operation of sortedOperations" :key="operation.recordNumber">
                <td>{{ operation.recordNumber }}</td>
                <td>
                  <v-icon left v-if="operation.recordTypeCategory == 'LOCK'">mdi-lock</v-icon>
                  <v-icon left v-else-if="operation.recordTypeCategory == 'UNLOCK'">mdi-lock-open-variant</v-icon>
                  <!-- <v-icon left v-else>mdi-history</v-icon> -->
                </td>
                <td>
                  {{ dateTime(operation.operateDate) }}
                </td>
                <td class="text-right">
                  {{ operation.electricQuantity }}%
                  <v-icon v-if="operation.electricQuantity > 90">mdi-battery-bluetooth</v-icon>
                  <v-icon v-else-if="operation.electricQuantity > 80">mdi-battery-90-bluetooth</v-icon>
                  <v-icon v-else-if="operation.electricQuantity > 70">mdi-battery-80-bluetooth</v-icon>
                  <v-icon v-else-if="operation.electricQuantity > 60">mdi-battery-70-bluetooth</v-icon>
                  <v-icon v-else-if="operation.electricQuantity > 50">mdi-battery-60-bluetooth</v-icon>
                  <v-icon v-else-if="operation.electricQuantity > 40">mdi-battery-50-bluetooth</v-icon>
                  <v-icon v-else-if="operation.electricQuantity > 30">mdi-battery-40-bluetooth</v-icon>
                  <v-icon v-else-if="operation.electricQuantity > 20">mdi-battery-30-bluetooth</v-icon>
                  <v-icon v-else color="red">mdi-battery-alert-bluetooth</v-icon>
                </td>
                <td>
                  <strong v-if="operation.passwordName">
                    {{ operation.passwordName }}
                  </strong>
                  <br />
                  <small v-if="operation.password">
                    {{ operation.password }}
                  </small>
                </td>
                <td>{{ operation.recordTypeName }}</td>
                <!-- <td>{{ JSON.stringify(operation) }}</td> -->
              </tr>
            </tbody>
          </template>
        </v-simple-table>
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
    }
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
