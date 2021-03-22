'use strict';

const fs = require('fs').promises;

class Store {
  constructor() {
    this.settingsPath = "/data";
    this.lockData = [];
    this.aliasData = {
      lock: {},
      card: {},
      finger: {}
    };
  }

  setDataPath(path) {
    this.settingsPath = path;
  }

  getDataPath() {
    return this.settingsPath;
  }

  setLockData(newData) {
    this.lockData = newData;
    this.saveData();
  }

  getLockData() {
    return this.lockData;
  }

  setLockAlias(address, alias) {
    this.aliasData.lock[address] = alias;
    this.saveData();
  }

  getLockAlias(address, defaultValue = false) {
    if (typeof this.aliasData.lock[address] != "undefined") {
      return this.aliasData.lock[address];
    } else {
      return defaultValue;
    }
  }

  setCardAlias(card, alias) {
    if (typeof alias != "undefined" && alias != "") {
      this.aliasData.card[card] = alias;
      this.saveData();
    }
  }

  getCardAlias(card) {
    if (typeof this.aliasData.card[card] != "undefined") {
      return this.aliasData.card[card];
    } else {
      return card;
    }
  }

  deleteCardAlias(card) {
    delete this.aliasData.card[card];
    this.saveData();
  }

  setFingerAlias(finger, alias) {
    this.aliasData.finger[finger] = alias;
    this.saveData();
  }

  getFingerAlias(finger) {
    if (typeof this.aliasData.finger[finger] != "undefined") {
      return this.aliasData.finger[finger];
    } else {
      return finger;
    }
  }

  deleteFingerAlias(finger) {
    delete this.aliasData.finger[finger];
    this.saveData();
  }

  async loadData() {
    try {
      await fs.access(this.settingsPath + "/lockData.json");
      const lockDataTxt = (await fs.readFile(this.settingsPath + "/lockData.json")).toString();
      this.lockData = JSON.parse(lockDataTxt);
    } catch (error) {
      this.lockData = [];
      console.error(error);
    }
    try {
      await fs.access(this.settingsPath + "/aliasData.json");
      const aliasDataTxt = (await fs.readFile(this.settingsPath + "/aliasData.json")).toString();
      this.aliasData = JSON.parse(aliasDataTxt);
    } catch (error) {
      this.aliasData = {
        lock: {},
        card: {},
        finger: {}
      };
      console.error(error);
    }

    return this.lockData;
  }

  async saveData() {
    try {
      await fs.writeFile(this.settingsPath + "/lockData.json", Buffer.from(JSON.stringify(this.lockData)));
    } catch (error) {
      console.error(error);
    }
    try {
      await fs.writeFile(this.settingsPath + "/aliasData.json", Buffer.from(JSON.stringify(this.aliasData)));
    } catch (error) {
      console.error(error);
    }
  }
}

const store = new Store();

module.exports = store;