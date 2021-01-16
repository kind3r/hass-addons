'use strict';

const EventEmitter = require('events');
const store = require("./store");

const ScanType = Object.freeze({
  NONE: 0,
  AUTOMATIC: 1,
  MANUAL: 2
});

const SCAN_MAX = 3;

/**
 * Sleep for
 * @param ms miliseconds
 */
async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
/**
 * Events:
 * - lockListChanged - when a lock was found during scanning
 * - lockPaired - a lock was paired
 * - lockConnected - a connetion to a lock was estabilisehed
 * - lockLock - a lock was locked
 * - lockUnlock - a lock was unlocked
 * - scanStart - scanning has started
 * - scanStop - scanning has stopped
 */
class Manager extends EventEmitter {
  constructor() {
    super();
    this.startupStatus = -1;
    this.client = undefined;
    this.scanning = false;
    this.scanType = ScanType.NONE;
    /** @type {NodeJS.Timeout} */
    this.scanTimer = undefined;
    this.scanCounter = 0;
    /** @type {Map<string, import('ttlock-sdk-js').TTLock>} Locks that are paired and were seen during the BLE scan */
    this.pairedLocks = new Map();
    /** @type {Map<string, import('ttlock-sdk-js').TTLock>} Locks that are pairable and were seen during the BLE scan */
    this.newLocks = new Map();
    /** @type {Set<string>} Locks found during scan that we need to connect to at least once to get their information */
    this.connectQueue = new Set();
    /** @type {'none'|'noble'} */
    this.gateway = 'none';
    this.gateway_host = "";
    this.gateway_port = 0;
    this.gateway_key = "";
    this.gateway_user =  "";
    this.gateway_pass = "";
  }

  async init() {
    if (typeof this.client == "undefined") {
      try {
        const { TTLockClient, sleep } = require("ttlock-sdk-js");

        let clientOptions = {}

        if (this.gateway == "noble") {
          clientOptions.scannerType = "noble-websocket";
          clientOptions.scannerOptions = {
            websocketHost: this.gateway_host,
            websocketPort: this.gateway_port,
            websocketAesKey: this.gateway_key,
            websocketUsername: this.gateway_user,
            websocketPassword: this.gateway_pass
          }
        }

        this.client = new TTLockClient(clientOptions);
        this.updateClientLockDataFromStore();

        const adapterReady = await this.client.prepareBTService();
        this.client.on("ready", () => {
          // should not trigger if prepareBTService emits it
          // but useful for when websocket reconnects
          this.startScan(ScanType.AUTOMATIC);
        });
        this.client.on("foundLock", this._onFoundLock.bind(this));
        this.client.on("updatedLock", this._onUpdatedLock.bind(this));
        this.client.on("scanStart", this._onScanStarted.bind(this));
        this.client.on("scanStop", this._onScanStopped.bind(this));
        // if there are saved locks start scanning to connect to them
        if (adapterReady && store.getLockData().length > 0) {
          await this.startScan(ScanType.AUTOMATIC);
        }

        this.startupStatus = 0;
      } catch (error) {
        console.log(error);
        this.startupStatus = 1;
      }
    }
  }

  updateClientLockDataFromStore() {
    const lockData = store.getLockData();
    this.client.setLockData(lockData);
  }

  setNobleGateway(gateway_host, gateway_port, gateway_key, gateway_user, gateway_pass) {
    this.gateway = "noble";
    this.gateway_host = gateway_host;
    this.gateway_port = gateway_port;
    this.gateway_key = gateway_key;
    this.gateway_user = gateway_user;
    this.gateway_pass = gateway_pass;
  }

  getStartupStatus() {
    return this.startupStatus;
  }

  async startScan(scanType) {
    if (!this.scanning) {
      if (typeof scanType == "undefined") {
        scanType = ScanType.MANUAL;
      }
      const res = await this.client.startScanLock();
      if (res) {
        this.scanType = scanType;
        this._scanTimer();
      }
      return res;
    }
    return false;
  }

  async stopScan() {
    if (this.scanning) {
      if (this.scanTimer) {
        clearTimeout(this.scanTimer);
        this.scanTimer = undefined;
      }
      this.scanType = ScanType.NONE;
      return await this.client.stopScanLock();
    }
    return false;
  }

  getIsScanning() {
    return this.scanning;
  }

  getPairedVisible() {
    return this.pairedLocks;
  }

  getNewVisible() {
    return this.newLocks;
  }

  /**
   * Init a new lock
   * @param {string} address MAC address
   */
  async initLock(address) {
    const lock = this.newLocks.get(address);
    if (typeof lock != "undefined") {
      if (!(await this._connectLock(lock))) {
        return false;
      }
      try {
        let res = await lock.initLock();
        if (res != false) {
          this.pairedLocks.set(lock.getAddress(), lock);
          this.newLocks.delete(lock.getAddress());
          store.setLockData(this.client.getLockData());
          await store.saveData();
          this.emit("lockPaired", lock);
          return true;
        }
        return false;
      } catch (error) {
        console.error(error);
        return false;
      }
    }
    return false;
  }

  async unlockLock(address) {
    const lock = this.pairedLocks.get(address);
    if (typeof lock != "undefined") {
      if (!(await this._connectLock(lock))) {
        return false;
      }
      try {
        const res = await lock.unlock();
        return res;
      } catch (error) {
        console.error(error);
      }
    }
    return false;
  }

  async lockLock(address) {
    const lock = this.pairedLocks.get(address);
    if (typeof lock != "undefined") {
      if (!(await this._connectLock(lock))) {
        return false;
      }
      try {
        const res = await lock.lock();
        return res;
      } catch (error) {
        console.error(error);
      }
    }
    return false;
  }

  async getCredentials(address) {
    const passcodes = await this.getPasscodes(address);
    const cards = await this.getCards(address);
    const fingers = await this.getFingers(address);
    return {
      passcodes: passcodes,
      cards: cards,
      fingers: fingers
    };
  }

  async addPasscode(address, type, passCode, startDate, endDate) {
    const lock = this.pairedLocks.get(address);
    if (typeof lock != "undefined") {
      if (!lock.hasPassCode()) {
        return false;
      }
      if (!(await this._connectLock(lock))) {
        return false;
      }
      try {
        const res = await lock.addPassCode(type, passCode, startDate, endDate);
        return res;
      } catch (error) {
        console.error(error);
      }
    }
    return false;
  }

  async updatePasscode(address, type, oldPasscode, newPasscode, startDate, endDate) {
    const lock = this.pairedLocks.get(address);
    if (typeof lock != "undefined") {
      if (!lock.hasPassCode()) {
        return false;
      }
      if (!(await this._connectLock(lock))) {
        return false;
      }
      try {
        const res = await lock.updatePassCode(type, oldPasscode, newPasscode, startDate, endDate);
        return res;
      } catch (error) {
        console.error(error);
      }
    }
    return false;
  }

  async deletePasscode(address, type, passCode) {
    const lock = this.pairedLocks.get(address);
    if (typeof lock != "undefined") {
      if (!lock.hasPassCode()) {
        return false;
      }
      if (!(await this._connectLock(lock))) {
        return false;
      }
      try {
        const res = await lock.deletePassCode(type, passCode);
        return res;
      } catch (error) {
        console.error(error);
      }
    }
    return false;
  }

  async getPasscodes(address) {
    const lock = this.pairedLocks.get(address);
    if (typeof lock != "undefined") {
      if (!lock.hasPassCode()) {
        return false;
      }
      if (!(await this._connectLock(lock))) {
        return false;
      }
      try {
        const passcodes = await lock.getPassCodes();
        return passcodes;
      } catch (error) {
        console.error(error);
      }
    }
    return false;
  }

  async addCard(address, startDate, endDate) {
    const lock = this.pairedLocks.get(address);
    if (typeof lock != "undefined") {
      if (!lock.hasICCard()) {
        return false;
      }
      if (!(await this._connectLock(lock))) {
        return false;
      }
      try {
        const card = await lock.addICCard(startDate, endDate);
        return card;
      } catch (error) {
        console.error(error);
      }
    }
    return false;
  }

  async updateCard(address, card, startDate, endDate) {
    const lock = this.pairedLocks.get(address);
    if (typeof lock != "undefined") {
      if (!lock.hasICCard()) {
        return false;
      }
      if (!(await this._connectLock(lock))) {
        return false;
      }
      try {
        const result = await lock.updateICCard(card, startDate, endDate);
        return result;
      } catch (error) {
        console.error(error);
      }
    }
    return false;
  }

  async deleteCard(address, card) {
    const lock = this.pairedLocks.get(address);
    if (typeof lock != "undefined") {
      if (!lock.hasICCard()) {
        return false;
      }
      if (!(await this._connectLock(lock))) {
        return false;
      }
      try {
        const result = await lock.deleteICCard(card);
        return result;
      } catch (error) {
        console.error(error);
      }
    }
    return false;
  }

  async getCards(address) {
    const lock = this.pairedLocks.get(address);
    if (typeof lock != "undefined") {
      if (!lock.hasICCard()) {
        return false;
      }
      if (!(await this._connectLock(lock))) {
        return false;
      }
      try {
        const cards = await lock.getICCards();
        return cards;
      } catch (error) {
        console.error(error);
      }
    }
    return false;
  }

  async addFinger(address, startDate, endDate) {
    const lock = this.pairedLocks.get(address);
    if (typeof lock != "undefined") {
      if (!lock.hasFingerprint()) {
        return false;
      }
      if (!(await this._connectLock(lock))) {
        return false;
      }
      try {
        const card = await lock.addFingerprint(startDate, endDate);
        return card;
      } catch (error) {
        console.error(error);
      }
    }
    return false;
  }

  async updateFinger(address, finger, startDate, endDate) {
    const lock = this.pairedLocks.get(address);
    if (typeof lock != "undefined") {
      if (!lock.hasFingerprint()) {
        return false;
      }
      if (!(await this._connectLock(lock))) {
        return false;
      }
      try {
        const result = await lock.updateFingerprint(finger, startDate, endDate);
        return result;
      } catch (error) {
        console.error(error);
      }
    }
    return false;
  }

  async deleteFinger(address, finger) {
    const lock = this.pairedLocks.get(address);
    if (typeof lock != "undefined") {
      if (!lock.hasFingerprint()) {
        return false;
      }
      if (!(await this._connectLock(lock))) {
        return false;
      }
      try {
        const result = await lock.deleteFingerprint(finger);
        return result;
      } catch (error) {
        console.error(error);
      }
    }
    return false;
  }

  async getFingers(address) {
    const lock = this.pairedLocks.get(address);
    if (typeof lock != "undefined") {
      if (!lock.hasFingerprint()) {
        return false;
      }
      if (!(await this._connectLock(lock))) {
        return false;
      }
      try {
        const cards = await lock.getFingerprints();
        return cards;
      } catch (error) {
        console.error(error);
      }
    }
    return false;
  }

  /**
   * 
   * @param {import('ttlock-sdk-js').TTLock} lock 
   * @param {boolean} readData 
   */
  async _connectLock(lock, readData = true) {
    if (this.scanning) return false;
    if (!lock.isConnected()) {
      try {
        const res = await lock.connect(!readData);
        if (!res) {
          console.log("Connect to lock failed", lock.getAddress());
          return false;
        }
      } catch (error) {
        console.error(error);
        return false;
      }
      return true;
    }
    return true;
  }

  async _onScanStarted() {
    this.scanning = true;
    console.log("BLE Scan started");
    this.emit("scanStart");
  }

  async _onScanStopped() {
    this.scanning = false;
    console.log("BLE Scan stopped");
    if (this.scanType == ScanType.NONE) {
      console.log("Refreshing paired locks");
      for (let [address, lock] of this.pairedLocks) {
        console.log("Auto connect to", address);
        const result = await lock.connect();
        if (result === true) {
          console.log("Successful connect attempt to paired lock", address);
          this.connectQueue.delete(address);
        } else {
          console.log("Unsuccessful connect attempt to paired lock", address);
        }
      }
    }
    this.emit("scanStop");
  }

  /**
   * 
   * @param {import('ttlock-sdk-js').TTLock} lock 
   */
  async _onFoundLock(lock) {
    let listChanged = false;
    if (lock.isPaired()) {
      // check if lock is known
      if (!this.pairedLocks.has(lock.getAddress())) {
        this._bindLockEvents(lock);
        // add it to the list of known locks and connect it
        console.log("Discovered paired lock:", lock.toJSON());
        this.pairedLocks.set(lock.getAddress(), lock);
        // add it to the connect queue
        this.connectQueue.add(lock.getAddress());
        // check if all known locks were found and stop scan
        if (this.scanType == ScanType.AUTOMATIC && this.connectQueue.size >= this.client.lockData.size) {
          console.log("All known locks found, stopping scan");
          await this.stopScan();
        }
        listChanged = true;
      }
    } else if (!lock.isInitialized()) {
      if (!this.newLocks.has(lock.getAddress())) {
        this._bindLockEvents(lock);
        // check if lock is in pairing mode
        // add it to the list of new locks, ready to be initialized
        console.log("Discovered new lock:", lock.toJSON());
        this.newLocks.set(lock.getAddress(), lock);
        listChanged = true;
      }
    } else {
      console.log("Discovered unknown lock:", lock.toJSON());
    }

    if (listChanged) {
      this.emit("lockListChanged");
    }
  }

  /**
   * 
   * @param {import('ttlock-sdk-js').TTLock} lock 
   */
  async _onUpdatedLock(lock) {
    if (lock.isPaired() && !this.pairedLocks.has(lock.getAddress())) {
      this._bindLockEvents(lock);
      // add it to the list of known locks
      console.log("Discovered paired lock:", lock.toJSON());
      this.pairedLocks.set(lock.getAddress(), lock);
      this.emit("lockListChanged");
    }
    if (lock.isPaired() && this.scanType == ScanType.NONE) {
      // if this was not updated during scanning (which performs a reconnect after), 
      // simulate a connect to push info to HA and UI
      this.emit("lockConnected", lock);
    }
  }

  /**
   * 
   * @param {import('ttlock-sdk-js').TTLock} lock 
   */
  _bindLockEvents(lock) {
    lock.on("connected", this._onLockConnected.bind(this));
    lock.on("disconnected", this._onLockDisconnected.bind(this));
    lock.on("locked", this._onLockLocked.bind(this));
    lock.on("unlocked", this._onLockUnlocked.bind(this));
    lock.on("scanICStart", () => this.emit("lockCardScan", lock));
    lock.on("scanFRStart", () => this.emit("lockFingerScan", lock));
    lock.on("scanFRProgress", () => this.emit("lockFingerScanProgress", lock));
  }

  /**
   * 
   * @param {import('ttlock-sdk-js').TTLock} lock 
   */
  async _onLockConnected(lock) {
    if (lock.isPaired()) {
      console.log("Connected to paired lock " + lock.getAddress());
      this.emit("lockConnected", lock);
    } else {
      console.log("Connected to new lock " + lock.getAddress());
    }
  }

  /**
   * 
   * @param {import('ttlock-sdk-js').TTLock} lock 
   */
  async _onLockDisconnected(lock) {
    console.log("Disconnected from lock " + lock.getAddress());
    store.setLockData(this.client.getLockData());
    await store.saveData();
  }

  /**
   * 
   * @param {import('ttlock-sdk-js').TTLock} lock 
   */
  async _onLockLocked(lock) {
    this.emit("lockLock", lock);
  }

  /**
   * 
   * @param {import('ttlock-sdk-js').TTLock} lock 
   */
  async _onLockUnlocked(lock) {
    this.emit("lockUnlock", lock);
  }

  /** Restart scan every 5 seconds to re-send scan packages */
  async _scanTimer() {
    if (typeof this.scanTimer == "undefined") {
      this.scanCounter = 0;
      this.scanTimer = setTimeout(this._scanTimer.bind(this), 5 * 1000);
    } else {
      this.scanCounter++;
      if (this.scanCounter < SCAN_MAX) {
        console.log("Restarting scan", this.scanCounter);
        await this.client.stopScanLock();
        await this.client.startScanLock();
        this.scanTimer = setTimeout(this._scanTimer.bind(this), 5 * 1000);
      } else {
        this.scanTimer = undefined;
        this.scanCounter = 0;
        await this.stopScan();
      }
    }
  }
}

const manager = new Manager();

module.exports = manager;