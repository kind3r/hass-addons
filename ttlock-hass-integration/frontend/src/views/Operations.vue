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
                <th class="text-left">Type</th>
                <th class="text-left">Date</th>
                <th class="text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="operation of operations" :key="operation.recordNumber">
                <td>{{ operation.recordTypeCategory }}</td>
                <td>
                  {{ dateTime(operation.operateDate) }}
                </td>
                <td>{{ operation.recordTypeName }}</td>
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
