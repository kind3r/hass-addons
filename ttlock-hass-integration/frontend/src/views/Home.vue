<template>
  <v-container fluid>
    <v-row no-gutters>
      <v-col v-for="lock in locks" :key="lock.address" lg="3" md="4" sm="12">
        <Lock :lock="lock" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import Lock from "@/components/Lock";

export default {
  name: "Home",
  components: {
    Lock,
  },
  computed: {
    locks() {
      return this.$store.state.locks;
    },
  },
};
</script>
