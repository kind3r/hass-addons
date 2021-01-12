'use strict';

class Lock {
  /** @type {string} MAC address */
  address;
  /** @type {number} Signal strength */
  rssi;
  /** @type {number} Battery level */
  battery;
  /** @type {string} Assigned name */
  name;
  /** @type {boolean} If the lock is paired or not */
  paired;
  /** @type {boolean} If the lock is connected or not */
  connected;
  /** @type {import('ttlock-sdk-js').LockedStatus} If the lock is locked or not, -1 unknown, 0 locked, 1 unlocked */
  locked;
  /** @type {number} The number of seconds the lock will auto lock after being unlocked */
  autoLockTime;

  /**
   * 
   * @param {import('ttlock-sdk-js').TTLock} lockObject 
   */
  static async fromTTLock(lockObject) {
    const lock = new Lock();

    lock.address = lockObject.getAddress();
    lock.name = lockObject.getName();
    lock.paired = lockObject.isPaired();
    lock.connected = lockObject.isConnected();
    lock.rssi = lockObject.getRssi();
    lock.battery = lockObject.getBattery();
    try {
      lock.autoLockTime = await lockObject.getAutolockTime();
      lock.locked = await lockObject.getLockStatus();
    } catch (error) {
      // new locks don't have this data
    }

    return lock;
  }
}

module.exports = Lock;