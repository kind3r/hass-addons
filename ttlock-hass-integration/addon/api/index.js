'use strict';

const WebSocket = require('ws');
const manager = require("../src/manager");
const store = require('../src/store');
const Message = require("./Message");
const WsApi = require("./WsApi");

module.exports = async (server) => {
  const wss = new WebSocket.Server({
    server: server,
    path: "/api"
  });

  async function sendStatusUpdate() {
    WsApi.sendStatus(wss);
  }

  async function sendLockStatusUpdate(lock) {
    WsApi.sendLockStatus(wss, lock);
  }

  manager.on("lockListChanged", sendStatusUpdate);
  manager.on("lockPaired", sendStatusUpdate);
  manager.on("lockConnected", sendLockStatusUpdate);
  manager.on("lockLock", sendLockStatusUpdate);
  manager.on("lockUnlock", sendLockStatusUpdate);
  manager.on("scanStart", sendStatusUpdate);
  manager.on("scanStop", sendStatusUpdate);

  wss.on('connection', (ws) => {

    const api = new WsApi(ws);

    ws.on('message', async (message) => {
      const msg = new Message(message);
      if (msg.isValid()) {
        switch (msg.type) {

          case "status": // send status
            sendStatusUpdate();
            break;

          case "scan": // start scanning
            manager.startScan();
            break;

          case "pair": // pair a lock
            if (msg.data && msg.data.address) {
              const paired = await manager.initLock(msg.data.address);
              if (!paired) {
                const locks = manager.getNewVisible();
                const lock = locks.get(msg.data.address);
                if (lock) {
                  WsApi.sendLockStatus(wss, lock);
                }
              }
            }
            break;

          case "lock": // lock a lock
            if (msg.data && msg.data.address) {
              const result = await manager.lockLock(msg.data.address);
              if (!result) {
                const locks = manager.getPairedVisible();
                const lock = locks.get(msg.data.address);
                if (lock) {
                  WsApi.sendLockStatus(wss, lock);
                }
              }
            }
            break;

          case "unlock": // unlock a lock
            if (msg.data && msg.data.address) {
              const result = await manager.unlockLock(msg.data.address);
              if (!result) {
                const locks = manager.getPairedVisible();
                const lock = locks.get(msg.data.address);
                if (lock) {
                  WsApi.sendLockStatus(wss, lock);
                }
              }
            }
            break;

          case "autolock":
            if (msg.data && msg.data.address) {
              if (typeof msg.data.time != "undefined") {
                const res = await manager.setAutoLock(msg.data.address, parseInt(msg.data.time));
                if (res === true) {
                  await sendStatusUpdate();
                  api.sendAutoLockSet(msg.data.addres);
                } else {
                  api.sendError("Unable to set auto-lock time", msg);
                }
              }
            }
            break;

          case "credentials": // read all credentials from lock
            if (msg.data && msg.data.address) {
              if (process.env.DEV_MODE) {
                WsApi._devSendCredentials(ws);
                break;
              }

              const credentials = await manager.getCredentials(msg.data.address);
              if (credentials !== false) {
                api.sendCredentials(msg.data.address, credentials);
              } else { // notify failure
                api.sendError("Failed fetching credentials", msg);
              }
            }
            break;

          case "passcode":
            if (msg.data && msg.data.address && msg.data.passcode) {
              if (process.env.DEV_MODE) {
                WsApi._devSendCredentials(ws);
                break;
              }

              const passcode = msg.data.passcode;
              let res = false;
              if (passcode.passCode == -1) { // add
                res = await manager.addPasscode(msg.data.address, passcode.type, passcode.newPassCode, passcode.startDate, passcode.endDate);
              } else if (passcode.newPassCode == -1) { // delete
                res = await manager.deletePasscode(msg.data.address, passcode.type, passcode.passCode);
              } else { // update
                res = await manager.updatePasscode(msg.data.address, passcode.type, passcode.passCode, passcode.newPassCode, passcode.startDate, passcode.endDate);
              }
              if (res) {
                // send updated passcode list
                const passcodes = await manager.getPasscodes(msg.data.address);
                if (passcodes !== false) {
                  api.sendPasscodes(msg.data.address, passcodes);
                } else { // notify failure
                  api.sendError("Failed fetching PINs", msg);
                }
              } else { // notify failure
                api.sendError("PIN operation failed", msg);
              }
            }
            break;

          case "card":
            if (msg.data && msg.data.address && msg.data.card) {
              if (process.env.DEV_MODE) {
                WsApi._devSendCredentials(ws);
                break;
              }

              const card = msg.data.card;
              let res = false;
              if (card.cardNumber == -1) { // add new card
                res = await manager.addCard(msg.data.address, card.startDate, card.endDate);
              } else if (card.startDate == -1) { // delete
                res = await manager.deleteCard(msg.data.address, card.cardNumber);
              } else { // update
                res = await manager.updateCard(msg.data.address, card.cardNumber, card.startDate, card.endDate);
              }
              if (res === false || res == "") { // notify failure
                api.sendError("Card operation failed", msg);
              } else {
                // send updated cards list
                const cards = await manager.getCards(msg.data.address);
                if (cards !== false) {
                  api.sendCards(msg.data.address, cards);
                } else { // notify failure
                  api.sendError("Failed fetching cards", msg);
                }
              }
            }
            break;

          case "finger":
            if (msg.data && msg.data.address && msg.data.finger) {
              if (process.env.DEV_MODE) {
                WsApi._devSendCredentials(ws);
                break;
              }

              const finger = msg.data.finger;
              let res = false;
              if (finger.fpNumber == -1) { // add new finger
                res = await manager.addFinger(msg.data.address, finger.startDate, finger.endDate);
              } else if (finger.startDate == -1) { // delete
                res = await manager.deleteFinger(msg.data.address, finger.fpNumber);
              } else { // update
                res = await manager.updateFinger(msg.data.address, finger.fpNumber, finger.startDate, finger.endDate);
              }
              if (res === false || res == "") { // notify failure
                api.sendError("Fingerprint operation failed", msg);
              } else {
                // send updated fingerprints list
                const fingers = await manager.getFingers(msg.data.address);
                if (fingers !== false) {
                  api.sendFingers(msg.data.address, fingers);
                } else { // notify failure
                  api.sendError("Failed fetching fingerprints", msg);
                }
              }
            }
            break;

          case "config":
            if (msg.data) {
              if (msg.data.get) {
                api.sendConfig();
              } else if (msg.data.set) {
                try {
                  const lockData = JSON.parse(msg.data.set);
                  store.setLockData(lockData);
                  await store.saveData();
                  manager.updateClientLockDataFromStore();
                  manager.startScan();
                  api.sendConfigConfirm();
                } catch (error) {
                  api.sendConfigConfirm("Failed to set config");
                }
              }
            }
            break;
        }
      }
    });

    async function sendLockCardScan(lock) {
      api.sendCardScan(lock.getAddress());
    }
  
    async function sendLockFingerScan(lock) {
      api.sendFingerScan(lock.getAddress());
    }
  
    async function sendLockFingerScanProgress(lock) {
      api.sendFingerScanProgress(lock.getAddress());
    }
    
    manager.on("lockCardScan", sendLockCardScan);
    manager.on("lockFingerScan", sendLockFingerScan);
    manager.on("lockFingerScanProgress", sendLockFingerScanProgress);
  
    ws.on("close", async () => {
      manager.off("lockCardScan", sendLockCardScan);
      manager.off("lockFingerScan", sendLockFingerScan);
      manager.off("lockFingerScanProgress", sendLockFingerScanProgress);
    });

    WsApi.sendStatus(wss);
  });
}