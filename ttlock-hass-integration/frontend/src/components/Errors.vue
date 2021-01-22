<template>
  <v-snackbar v-model="hasErrors" :vertical="true" :timeout="-1" color="red">
    <v-list-item>
      <v-list-item-content>
        <v-list-item-title v-for="error of errors" :key="error.message">{{ error.message }}</v-list-item-title>
      </v-list-item-content>
    </v-list-item>

    <template v-slot:action="{ attrs }">
      <v-btn color="black" text v-bind="attrs" @click="clearErrors"> Close </v-btn>
    </template>
  </v-snackbar>
</template>
<script>
export default {
  name: "Errors",
  computed: {
    hasErrors() {
      return this.errors.length > 0;
    },
    errors() {
      return this.$store.state.errors;
    },
  },
  methods: {
    clearErrors() {
      this.$store.commit("clearErrors");
    },
  }
};
</script>