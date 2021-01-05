'use strict';

const fs = require('fs').promises;

class Store {
  constructor() {
    this.settingsPath = "/data/lockData.json";
    this.data = [];
  }

  setDataPath(path) {
    this.settingsPath = path;
  }

  getDataPath() {
    return this.settingsPath;
  }

  setLockData(newData) {
    this.data = newData;
  }

  getLockData() {
    return this.data;
  }

  async loadData() {
    try {
      await fs.access(this.settingsPath);
      const lockDataTxt = (await fs.readFile(this.settingsPath)).toString();
      this.data = JSON.parse(lockDataTxt);
    } catch (error) {
      this.data = [];
      console.error(error);
    }
    return this.data;
  }

  async saveData() {
    try {
      await fs.writeFile(this.settingsPath, Buffer.from(JSON.stringify(this.data)));
    } catch (error) {
      console.error(error);
    }
  }
}

const store = new Store();

module.exports = store;