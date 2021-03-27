'use strict';

const WebSocket = require('ws');
const manager = require("../src/manager");
const store = require("../src/store");
const Lock = require("./Lock");
const Message = require("./Message");
const { sleep } = require("ttlock-sdk-js");

class WsApi {
  /**
   * 
   * @param {WebSocket} ws 
   */
  constructor(ws) {
    this.ws = ws;
  }

  /**
   * Send status update and lock list
   * @param {WebSocket.Server} wss
   */
  static async sendStatus(wss) {
    const message = new Message();
    message.setType("status");
    message.setData({
      startup: manager.getStartupStatus(),
      scan: manager.getIsScanning() ? 1 : 0,
      locks: await WsApi.getLocks()
    });
    for (let ws of wss.clients) {
      ws.send(message.toJSON());
    }
  }

  /**
   * @param {WebSocket.Server} wss
   * @param {import('ttlock-sdk-js').TTLock} lock 
   */
  static async sendLockStatus(wss, lock) {
    const message = new Message();
    message.setType("lockStatus");
    message.setData(await Lock.fromTTLock(lock));
    for (let ws of wss.clients) {
      ws.send(message.toJSON());
    }
  }

  async sendCredentials(address, credentials) {
    const message = new Message();
    message.setType("credentials");
    message.setData({
      address: address,
      passcodes: credentials.passcodes,
      cards: credentials.cards,
      fingers: credentials.fingers
    });
    this.ws.send(message.toJSON());
  }

  async sendPasscodes(address, passcodes) {
    const message = new Message();
    message.setType("credentials");
    message.setData({
      address: address,
      passcodes: passcodes,
    });
    this.ws.send(message.toJSON());
  }

  async sendCards(address, cards) {
    const message = new Message();
    message.setType("credentials");
    message.setData({
      address: address,
      cards: cards,
    });
    this.ws.send(message.toJSON());
  }

  async sendCardScan(address) {
    const message = new Message();
    message.setType("cardScan");
    message.setData({
      address: address,
    });
    this.ws.send(message.toJSON());
  }

  async sendFingers(address, fingers) {
    const message = new Message();
    message.setType("credentials");
    message.setData({
      address: address,
      fingers: fingers,
    });
    this.ws.send(message.toJSON());
  }

  async sendFingerScan(address) {
    const message = new Message();
    message.setType("fingerScan");
    message.setData({
      address: address,
    });
    this.ws.send(message.toJSON());
  }

  async sendFingerScanProgress(address) {
    const message = new Message();
    message.setType("fingerScanProgress");
    message.setData({
      address: address,
    });
    this.ws.send(message.toJSON());
  }

  async sendSettingsConfirmation(address, settings) {
    const message = new Message();
    message.setType("settings");
    message.setData({
      address: address,
      settings: settings
    });
    this.ws.send(message.toJSON());
  }

  async sendError(error, originalMessage) {
    const message = new Message();
    message.setType("error");
    message.setData({
      message: error,
      originalMessage: originalMessage
    });
    this.ws.send(message.toJSON());
  }

  async sendConfig() {
    const message = new Message();
    message.setType("config");
    message.setData({
      config: JSON.stringify(store.getLockData())
    });
    this.ws.send(message.toJSON());
  }

  async sendConfigConfirm(error) {
    const message = new Message();
    message.setType("config");
    message.setData({
      set: typeof error != "undefined" ? error : true
    });
    this.ws.send(message.toJSON());
  }

  async sendOperationLog(address, operations) {
    const message = new Message();
    message.setType("operations");
    message.setData({
      address: address,
      operations: operations
    });
    this.ws.send(message.toJSON());
  }

  static async getLocks() {
    if (process.env.DEV_MODE) {
      return await WsApi._devLocks();
    }
    const newVisibleLocks = manager.getNewVisible();
    const pairedVisibleLocks = manager.getPairedVisible();
    let locks = [];
    for (let [address, lock] of newVisibleLocks) {
      try {
        locks.push(await Lock.fromTTLock(lock));
      } catch (error) {
        // lock was not connected yet
      }
    }
    for (let [address, lock] of pairedVisibleLocks) {
      try {
        locks.push(await Lock.fromTTLock(lock));
      } catch (error) {
        // lock was not connected yet
      }
    }
    return locks;
  }

  static async _devLocks() {
    await sleep(1000);
    return JSON.parse('[{"address":"E1:58:1B:3A:60:5E","rssi":-73,"battery":63,"name":"S202F_5e603a","paired":true,"connected":false,"locked":0,"autoLockTime":5}]');
  }

  static async _devSendCredentials(ws) {
    await sleep(2000);
    ws.send('{"type":"credentials","data":{"address":"E1:58:1B:3A:60:5E","passcodes":[{"type":1,"newPassCode":"654321","passCode":"654321","startDate":"200001010000"},{"type":1,"newPassCode":"123456","passCode":"123456","startDate":"200001010000"}],"cards":[{"cardNumber":"1978662719","startDate":"200001010000","endDate":"209912012359"},{"cardNumber":"167741690","startDate":"200001010000","endDate":"202212312359"},{"cardNumber":"147943900","startDate":"200001010000","endDate":"202212312359"}],"fingers":[{"fpNumber":"43431281557504","startDate":"200001010000","endDate":"202212312359"}]}}');
  }
}

module.exports = WsApi;