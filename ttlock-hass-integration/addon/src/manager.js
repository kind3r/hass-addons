'use strict';

const EventEmitter = require('events');
const store = require("./store");
const { TTLockClient, AudioManage, LockedStatus, LogOperateCategory, LogOperateNames } = require("ttlock-sdk-js");

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
    this.gateway_user = "";
    this.gateway_pass = "";
  }

  async init() {
    if (typeof this.client == "undefined") {
      try {
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

        this.client.on("ready", () => {
          // should not trigger if prepareBTService emits it
          // but useful for when websocket reconnects
          // disable it for now as the reconnection won't re-trigger ready
          // this.startScan(ScanType.AUTOMATIC);
          this.client.startMonitor();
        });
        this.client.on("foundLock", this._onFoundLock.bind(this));
        this.client.on("scanStart", this._onScanStarted.bind(this));
        this.client.on("scanStop", this._onScanStopped.bind(this));
        this.client.on("monitorStart", () => console.log("Monitor started"));
        this.client.on("monitorStop", () => console.log("Monitor stopped"));
        this.client.on("updatedLockData", this._onUpdatedLockData.bind(this));
        const adapterReady = await this.client.prepareBTService();
        if (adapterReady) {
          this.startupStatus = 0;
        } else {
          this.startupStatus = 1;
        }
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

  async startScan() {
    if (!this.scanning) {
      await this.client.stopMonitor();
      const res = await this.client.startScanLock();
      if (res == true) {
        this._scanTimer();
      }
      return res;
    }
    return false;
  }

  async stopScan() {
    if (this.scanning) {
      if (typeof this.scanTimer != "undefined") {
        clearTimeout(this.scanTimer);
        this.scanTimer = undefined;
      }
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
          this._bindLockEvents(lock);
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

  async setAutoLock(address, value) {
    const lock = this.pairedLocks.get(address);
    if (typeof lock != "undefined") {
      if (!(await this._connectLock(lock))) {
        return false;
      }
      try {
        const res = await lock.setAutoLockTime(value);
        this.emit("lockUpdated", lock);
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

  async addCard(address, startDate, endDate, alias) {
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
        store.setCardAlias(card, alias);
        return card;
      } catch (error) {
        console.error(error);
      }
    }
    return false;
  }

  async updateCard(address, card, startDate, endDate, alias) {
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
        store.setCardAlias(card, alias);
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
        store.deleteCardAlias(card);
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
        let cards = await lock.getICCards();
        if (cards.length > 0) {
          for (let card of cards) {
            card.alias = store.getCardAlias(card.cardNumber);
          }
        }
        return cards;
      } catch (error) {
        console.error(error);
      }
    }
    return false;
  }

  async addFinger(address, startDate, endDate, alias) {
    const lock = this.pairedLocks.get(address);
    if (typeof lock != "undefined") {
      if (!lock.hasFingerprint()) {
        return false;
      }
      if (!(await this._connectLock(lock))) {
        return false;
      }
      try {
        const finger = await lock.addFingerprint(startDate, endDate);
        store.setFingerAlias(finger, alias);
        return finger;
      } catch (error) {
        console.error(error);
      }
    }
    return false;
  }

  async updateFinger(address, finger, startDate, endDate, alias) {
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
        store.setFingerAlias(finger, alias);
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
        store.deleteFingerAlias(finger);
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
        let fingers = await lock.getFingerprints();
        if (fingers.length > 0) {
          for (let finger of fingers) {
            finger.alias = store.getFingerAlias(finger.fpNumber);
          }
        }
        return fingers;
      } catch (error) {
        console.error(error);
      }
    }
    return false;
  }

  async setAudio(address, audio) {
    const lock = this.pairedLocks.get(address);
    if (typeof lock != "undefined") {
      if (!lock.hasLockSound()) {
        return false;
      }
      if (!(await this._connectLock(lock))) {
        return false;
      }
      try {
        const sound = audio == true ? AudioManage.TURN_ON : AudioManage.TURN_OFF;
        const res = await lock.setLockSound(sound);
        this.emit("lockUpdated", lock);
        return res;
      } catch (error) {
        console.error(error);
      }
    }
    return false;
  }

  async getOperationLog(address, reload) {
    const lock = this.pairedLocks.get(address);
    if (typeof reload == "undefined") {
      reload = false;
    }
    if (typeof lock != "undefined") {
      if (!(await this._connectLock(lock))) {
        return false;
      }
      try {
        let operations = JSON.parse(JSON.stringify(await lock.getOperationLog(true, reload)));
        let validOperations = [];
        // console.log(operations);
        for (let operation of operations) {
          if (operation) {
            operation.recordTypeName = LogOperateNames[operation.recordType];
            if (LogOperateCategory.LOCK.includes(operation.recordType)) {
              operation.recordTypeCategory = "LOCK";
            } else if (LogOperateCategory.UNLOCK.includes(operation.recordType)) {
              operation.recordTypeCategory = "UNLOCK";
            } else if (LogOperateCategory.FAILED.includes(operation.recordType)) {
              operation.recordTypeCategory = "FAILED";
            } else {
              operation.recordTypeCategory = "OTHER";
            }
            if (typeof operation.password != "undefined") {
              if (LogOperateCategory.IC.includes(operation.recordType)) {
                operation.passwordName = store.getCardAlias(operation.password);
              } else if (LogOperateCategory.FR.includes(operation.recordType)) {
                operation.passwordName = store.getFingerAlias(operation.password);
              }
            }
            validOperations.push(operation);
          }
        }
        return validOperations;
      } catch (error) {
        console.error(error);
      }
    } else {
      return false;
    }
  }

  async resetLock(address) {
    const lock = this.pairedLocks.get(address);
    if (typeof lock != "undefined") {
      if (!(await this._connectLock(lock))) {
        return false;
      }
      try {
        const res = await lock.resetLock();
        if (res) {
          lock.removeAllListeners();
          this.pairedLocks.delete(address);
          this.emit("lockListChanged");
        }
        return res;
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
    console.log("Refreshing paired locks");
    for (let address of this.connectQueue) {
      if (this.pairedLocks.has(address)) {
        let lock = this.pairedLocks.get(address);
        console.log("Auto connect to", address);
        const result = await lock.connect();
        if (result === true) {
          await lock.disconnect();
          console.log("Successful connect attempt to paired lock", address);
          this.connectQueue.delete(address);
        } else {
          console.log("Unsuccessful connect attempt to paired lock", address);
        }
      }
    }

    this.emit("scanStop");
    setTimeout(() => {
      this.client.startMonitor();
    }, 200);
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
        console.log("Discovered paired lock:", lock.getAddress());
        if (this.client.isMonitoring()) {
          const result = await lock.connect();
          if (result == true) {
            console.log("Successful connect attempt to paired lock", lock.getAddress());
            await this._processOperationLog(lock);
          } else {
            console.log("Unsuccessful connect attempt to paired lock", lock.getAddress());
            this.connectQueue.add(lock.getAddress());
          }
          await lock.disconnect();
        } else {
          // add it to the connect queue
          this.connectQueue.add(lock.getAddress());
        }
        listChanged = true;
      }
    } else if (!lock.isInitialized()) {
      if (!this.newLocks.has(lock.getAddress())) {
        // this._bindLockEvents(lock);
        // check if lock is in pairing mode
        // add it to the list of new locks, ready to be initialized
        console.log("Discovered new lock:", lock.toJSON());
        this.newLocks.set(lock.getAddress(), lock);
        listChanged = true;
        if (this.client.isScanning()) {
          console.log("New lock found, stopping scan");
          await this.stopScan();
        }
      }
    } else {
      console.log("Discovered unknown lock:", lock.toJSON());
    }

    if (listChanged) {
      this.emit("lockListChanged");
    }
  }

  async _onUpdatedLockData() {
    store.setLockData(this.client.getLockData());
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
    lock.on("updated", this._onLockUpdated.bind(this));
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
      this.pairedLocks.set(lock.getAddress(), lock);
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
    this.client.startMonitor();
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

  /**
   * 
   * @param {import('ttlock-sdk-js').TTLock} lock 
   */
  async _onLockUpdated(lock, paramsChanged) {
    console.log("lockUpdated", paramsChanged);
    // if lock has new operations read the operations and send updates
    if (paramsChanged.newEvents == true && lock.hasNewEvents()) {
      if (!lock.isConnected()) {
        const result = await lock.connect();
        // TODO: handle failed connection
      }
      await this._processOperationLog(lock);
    }
    if (paramsChanged.lockedStatus == true) {
      const status = await lock.getLockStatus();
      if (status == LockedStatus.LOCKED) {
        console.log(">>>>>> Lock is now locked from new event <<<<<<");
        this.emit("lockLock", lock);
      }
    }
    if (paramsChanged.batteryCapacity == true) {
      this.emit("lockUpdated", lock);
    }

    await lock.disconnect();
  }

  async _processOperationLog(lock) {
    let operations = await lock.getOperationLog();
    let lastStatus = LockedStatus.UNKNOWN;
    for (let op of operations) {
      if (LogOperateCategory.UNLOCK.includes(op.recordType)) {
        lastStatus = LockedStatus.UNLOCKED;
        console.log(">>>>>> Lock was unlocked <<<<<<");
        this.emit("lockUnlock", lock);
      } else if (LogOperateCategory.LOCK.includes(op.recordType)) {
        lastStatus = LockedStatus.LOCKED;
        console.log(">>>>>> Lock was locked <<<<<<");
        this.emit("lockLock", lock);
      }
    }
    const status = await lock.getLockStatus();
    if (lastStatus != LockedStatus.UNKNOWN && status != lastStatus) {
      if (status == LockedStatus.LOCKED) {
        console.log(">>>>>> Lock is now locked <<<<<<");
        this.emit("lockLock", lock);
      } else if (status == LockedStatus.UNLOCKED) {
        console.log(">>>>>> Lock is now unlocked <<<<<<");
        this.emit("lockUnlock", lock);
      }
    }
  }

  /** Stop scan after 30 seconds */
  async _scanTimer() {
    if (typeof this.scanTimer == "undefined") {
      this.scanTimer = setTimeout(() => {
        this.stopScan();
      }, 30 * 1000);
    }
  }
}

const manager = new Manager();

module.exports = manager;