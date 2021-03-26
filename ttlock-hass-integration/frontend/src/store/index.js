import Vue from 'vue';
import Vuex from 'vuex';
import Api from "../api";

Vue.use(Vuex)

/** @type {Api} */
let api;

const store = new Vuex.Store({
  state: {
    ready: false,
    startupStatus: -1,
    scanStatus: 0,
    locks: [],
    passcodes: {},
    cards: {},
    fingers: {},
    operations: {},
    waitingCredentials: false,
    waitingCardScan: false,
    waitingFingerScan: false,
    fingerScanProgress: 0,
    waitingOperations: false,
    waiting: false,
    errors: [],
    activeLockAddress: "",
    config: "",
    waitingConfig: false,
    waitingAutoLock: false,
    waitingSettings: false
  },
  mutations: {
    setReady(state) {
      state.ready = true;
    },
    setStartupStatus(state, status) {
      state.startupStatus = status;
    },
    setScanStatus(state, status) {
      state.scanStatus = status;
    },
    setLocks(state, locks) {
      state.locks = locks;
      state.waiting = false;
    },
    setLock(state, updatedLock) {
      let newLocks = [];
      let updated = false;
      for (const lock of state.locks) {
        if (lock.address == updatedLock.address) {
          newLocks.push(updatedLock);
          updated = true;
        } else {
          newLocks.push(lock);
        }
      }
      if (!updated) {
        newLocks.push(updatedLock);
      }
      state.locks = newLocks;
      state.waiting = false;
    },
    setWaitingCredentials(state) {
      state.waitingCredentials = true;
    },
    setWaitingCardScan(state) {
      state.waitingCardScan = true;
    },
    setWaitingFingerScan(state) {
      state.waitingFingerScan = true;
    },
    setFingerScanProgress(state) {
      state.fingerScanProgress++;
    },
    setWaiting(state) {
      state.waiting = true;
    },
    setCredentials(state, data) {
      if (typeof data.address != "undefined") {
        // set passcodes if available
        if (typeof data.passcodes != "undefined") {
          let newPasscodes = {};
          newPasscodes[data.address] = data.passcodes;
          for (const address in state.passcodes) {
            if (address != data.address) {
              newPasscodes[address] = state.passcodes[address];
            }
          }
          state.passcodes = newPasscodes;
        }
        // set cards if available
        if (typeof data.cards != "undefined") {
          let newCards = {};
          newCards[data.address] = data.cards;
          for (const address in state.cards) {
            if (address != data.address) {
              newCards[address] = state.cards[address];
            }
          }
          state.cards = newCards;
        }
        // set fingerprints if available
        if (typeof data.fingers != "undefined") {
          let newFingers = {};
          newFingers[data.address] = data.fingers;
          for (const address in state.fingers) {
            if (address != data.address) {
              newFingers[address] = state.fingers[address];
            }
          }
          state.fingers = newFingers;
        }
        state.waitingCredentials = false;
        state.waitingCardScan = false;
        state.waitingFingerScan = false;
        state.fingerScanProgress = 0;
      }
    },
    setError(state, data) {
      state.errors.push(data);
      state.waiting = false;
      state.waitingCredentials = false;
      state.waitingCardScan = false;
      state.waitingFingerScan = false;
      state.fingerScanProgress = 0;
      state.waitingAutoLock = false;
      state.waitingOperations = false;
    },
    clearErrors(state) {
      state.errors = [];
    },
    setActiveLockAddress(state, lockAddress) {
      state.activeLockAddress = lockAddress;
    },
    setConfig(state, config) {
      state.config = config;
      state.waitingConfig = false;
    },
    setOperations(state, data) {
      let newOperations = {};
      newOperations[data.address] = data.operations;
      for (const address in state.operations) {
        if (address != data.address) {
          newOperations[address] = state.operations[address];
        }
      }
      state.operations = newOperations;
      state.waitingOperations = false;
    },
    setWaitingConfig(state, isWaiting) {
      state.waitingConfig = isWaiting;
    },
    setWaitingAutoLock(state, isWaiting) {
      state.waitingAutoLock = isWaiting;
    },
    setWaitingSettings(state, isWaiting) {
      state.waitingSettings = isWaiting;
    },
    setWaitingOperations(state, isWaiting) {
      state.waitingOperations = isWaiting;
    }
  },
  actions: {
    async init({ commit }) {
      if (typeof api == "undefined") {
        api = new Api(store);
        await api.connect();
        commit("setReady");
      }
    },
    async scan({ state }) {
      if (state.waiting) return;
      api.scan();
    },
    async unlock({ state, commit }, lockAddress) {
      if (state.waiting) return;
      commit("setWaiting");
      api.unlock(lockAddress);
    },
    async lock({ state, commit }, lockAddress) {
      if (state.waiting) return;
      commit("setWaiting");
      api.lock(lockAddress);
    },
    async pair({ state, commit }, lockAddress) {
      if (state.waiting) return;
      commit("setWaiting");
      api.pair(lockAddress);
    },
    async setAutoLock({ state, commit }, { lockAddress, time }) {
      if (state.waitingAutoLock) return;
      commit("setWaitingAutoLock", true);
      api.setAutoLock(lockAddress, time);
    },
    async readCredentials({ state, commit }, lockAddress) {
      if (state.waiting || state.waitingCredentials) return;
      commit("setWaitingCredentials");
      // TODO:check if credentials are already loaded
      api.requestCredentials(lockAddress);
    },
    async setPasscode({ state, commit }, { lockAddress, passcode }) {
      if (state.waiting || state.waitingCredentials) return;
      commit("setWaitingCredentials");
      api.setPasscode(lockAddress, passcode);
    },
    async setCard({ state, commit }, { lockAddress, card }) {
      if (state.waiting || state.waitingCredentials) return;
      commit("setWaitingCredentials");
      api.setCard(lockAddress, card);
    },
    async setFinger({ state, commit }, { lockAddress, finger }) {
      if (state.waiting || state.waitingCredentials) return;
      commit("setWaitingCredentials");
      api.setFinger(lockAddress, finger);
    },
    async loadConfig({ state, commit }) {
      if (state.waitingConfig) return;
      commit("setConfig", "");
      commit("setWaitingConfig", true);
      api.loadConfig();
    },
    async saveConfig({ state, commit }, config) {
      if (state.waitingConfig) return;
      commit("setConfig", "");
      commit("setWaitingConfig", true);
      api.saveConfig(config);
    },
    async saveSettings({ state, commit }, { lockAddress, settings }) {
      if (state.waitingSetings) return;
      commit("setWaitingSettings", true);
      api.saveSettings(lockAddress, settings);
    },
    async readOperations({state, commit}, lockAddress) {
      if (state.waiting || state.waitingOperations) return;
      commit("setWaitingOperations", true);
      api.requestOperations(lockAddress);
    },
    async unpair({state, commit}, lockAddress) {
      if (state.waiting) return;
      commit("setWaiting");
      api.unpair(lockAddress);
    }
  }
});

store.dispatch("init");

export default store;
