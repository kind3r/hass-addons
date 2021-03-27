'use strict';

import ReconnectingWebSocket from 'reconnecting-websocket';

class Api {
  store;
  /**
   * @type {ReconnectingWebSocket}
   */
  ws;

  constructor(store, url) {
    this.store = store;
    if (typeof url != "undefined") {
      this.url = url;
    } else {
      let path = window.location.href
        .replace("http", "ws")
        .replace(window.location.hash, "")
        .replace("/frontend/", "/api");
      // local development (addon has to be started also)
      if (path.substr(path.length - 4, 4) != "/api") {
        path += "api";
      }
      console.log("Discovered WS API path", path);
      this.url = path;
    }
  }

  async connect() {
    if (typeof this.ws == "undefined") {
      this.ws = new ReconnectingWebSocket(this.url, [], {
        startClosed: true
      });

      this.ws.addEventListener("message", this._onMessage.bind(this));
    }

    this.ws.reconnect();
  }

  async scan() {
    this.ws.send(JSON.stringify({
      type: "scan",
    }));
  }

  async lock(address) {
    this.ws.send(JSON.stringify({
      type: "lock",
      data: {
        address: address
      }
    }));
  }

  async unlock(address) {
    this.ws.send(JSON.stringify({
      type: "unlock",
      data: {
        address: address
      }
    }));
  }

  async pair(address) {
    this.ws.send(JSON.stringify({
      type: "pair",
      data: {
        address: address
      }
    }));
  }

  async setAutoLock(address, time) {
    this.ws.send(JSON.stringify({
      type: "autolock",
      data: {
        address: address,
        time: time
      }
    }));
  }

  async requestCredentials(address) {
    this.ws.send(JSON.stringify({
      type: "credentials",
      data: {
        address: address
      }
    }));
  }

  async setPasscode(address, passcode) {
    this.ws.send(JSON.stringify({
      type: "passcode",
      data: {
        address: address,
        passcode: passcode
      }
    }));
  }

  async setCard(address, card) {
    this.ws.send(JSON.stringify({
      type: "card",
      data: {
        address: address,
        card: card
      }
    }));
  }

  async setFinger(address, finger) {
    this.ws.send(JSON.stringify({
      type: "finger",
      data: {
        address: address,
        finger: finger
      }
    }));
  }

  async loadConfig() {
    this.ws.send(JSON.stringify({
      type: "config",
      data: {
        get: true
      }
    }));
  }

  async saveConfig(config) {
    this.ws.send(JSON.stringify({
      type: "config",
      data: {
        set: config
      }
    }));
  }

  async saveSettings(address, settings) {
    this.ws.send(JSON.stringify({
      type: "settings",
      data: {
        address: address,
        settings: settings
      }
    }));
  }

  async requestOperations(address) {
    this.ws.send(JSON.stringify({
      type: "operations",
      data: {
        address: address
      }
    }));
  }

  async unpair(address) {
    this.ws.send(JSON.stringify({
      type: "unpair",
      data: {
        address: address
      }
    }));
  }

  async _onMessage(messageEvent) {
    try {
      const message = JSON.parse(messageEvent.data);
      if (message.type) {
        switch (message.type) {
          case "status":
            if (message.data) {
              const data = message.data;
              if (typeof data.startup != "undefined") {
                this.store.commit("setStartupStatus", data.startup);
              }
              if (typeof data.scan != "undefined") {
                this.store.commit("setScanStatus", data.scan);
              }
              if (typeof data.locks != "undefined") {
                this.store.commit("setLocks", data.locks);
              }
            }
            break;
          case "lockStatus":
            if (message.data) {
              this.store.commit("setLock", message.data);
            }
            break;
          case "autolock":
            this.store.commit("setWaitingAutoLock", false);
            break;
          case "credentials":
            if (message.data) {
              const data = message.data;
              if (typeof data.address != "undefined") {
                this.store.commit("setCredentials", data);
              }
            }
            break;
          case "cardScan":
            this.store.commit("setWaitingCardScan");
            break;
          case "fingerScan":
            this.store.commit("setWaitingFingerScan");
            break;
          case "fingerScanProgress":
            this.store.commit("setFingerScanProgress");
            break;
          case "settings":
            this.store.commit("setWaitingSettings", false);
            break;
          case "error":
            this.store.commit("setError", message.data);
            break;
          case "config":
            if (typeof message.data.config != "undefined") {
              this.store.commit("setConfig", message.data.config);
            } else {
              this.store.commit("setWaitingConfig", false);
              if (message.data.set !== true) {
                this.store.commit("setError", message.data.set);
              }
            }
            break;
          case "operations":
            if (typeof message.data != "undefined") {
              const data = message.data;
              if (typeof data.address != "undefined" && typeof data.operations != "undefined") {
                this.store.commit("setOperations", data);
              }
            }
            break;
        }
      }
    } catch (error) {
      console.error(error);
    }
  }
}

export default Api;