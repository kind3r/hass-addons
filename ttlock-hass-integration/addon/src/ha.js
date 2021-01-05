'use stricet';

const mqtt = require('async-mqtt');
const store = require('./store');
const { LockedStatus } = require('ttlock-sdk-js');

class HomeAssistant {
  /**
   * 
   * @param {import('./manager')} manager 
   * @param {Object} options
   * @param {string} options.mqttUrl 
   * @param {string} options.mqttUser 
   * @param {string} options.mqttPass 
   * @param {string} options.discovery_prefix 
   */
  constructor(manager, options) {
    console.info("Setting up Home Assistant MQTT connection");

    this.manager = manager;
    this.mqttUrl = options.mqttUrl;
    this.mqttUser = options.mqttUser;
    this.mqttPass = options.mqttPass;
    this.discovery_prefix = options.discovery_prefix || "homeassistant";
    this.configuredLocks = new Set();

    this.connected = false;

    this.manager.on("lockPaired", this._onLockPaired.bind(this));
    this.manager.on("lockConnected", this._onLockConnected.bind(this));
    this.manager.on("lockUnlock", this._onLockUnlock.bind(this));
    this.manager.on("lockLock", this._onLockLock.bind(this));
  }

  async connect() {
    if (!this.connected) {
      this.client = await mqtt.connectAsync(this.mqttUrl, {
        username: this.mqttUser,
        password: this.mqttPass
      });
      this.client.on("message", this._onMQTTMessage.bind(this));
      await this.client.subscribe("ttlock/#");
      this.connected = true;
      console.log("MQTT connected");
    }
  }

  /**
   * Construct a unique ID for a lock, based on the MAC address
   * @param {import('ttlock-sdk-js').TTLock} lock 
   */
  getLockId(lock) {
    const address = lock.getAddress();
    return address.split(":").join("").toLowerCase();
  }

  /**
   * Configure a lock device in HA
   * @param {import('ttlock-sdk-js').TTLock} lock 
   */
  async configureLock(lock) {
    if (this.connected && !this.configuredLocks.has(lock.getAddress())) {
      // setup lock entity
      const id = this.getLockId(lock);
      const name = lock.getName();
      const device = {
        identifiers: [
          "ttlock_" + id
        ],
        "name": name,
        "manufacturer": lock.getManufacturer(),
        "model": lock.getModel(),
        "sw_version": lock.getFirmware()
      };

      // setup lock state
      const configLockTopic = this.discovery_prefix + "/lock/" + id + "/lock/config";
      const lockPayload = {
        unique_id: "ttlock_" + id,
        name: name,
        device: device,
        state_topic: "ttlock/" + id,
        command_topic: "ttlock/" + id + "/set",
        payload_lock: "LOCK",
        payload_unlock: "UNLOCK",
        state_locked: "LOCK",
        state_unlocked: "UNLOCK",
        value_template: "{{ value_json.state }}",
        optimistic: false,
        retain: true
      }
      console.log("MQTT Publish", configLockTopic, JSON.stringify(lockPayload));
      let res = await this.client.publish(configLockTopic, JSON.stringify(lockPayload));

      // setup battery sensor
      const configBatteryTopic = this.discovery_prefix + "/sensor/" + id + "/battery/config";
      const batteryPayload = {
        unique_id: "ttlock_" + id + "_battery",
        name: name + " Battery",
        device: device,
        device_class: "battery",
        unit_of_measurement: "%",
        state_topic: "ttlock/" + id,
        value_template: "{{ value_json.battery }}",
      }
      console.log("MQTT Publish", configBatteryTopic, JSON.stringify(batteryPayload));
      res = await this.client.publish(configBatteryTopic, JSON.stringify(batteryPayload));

      // setup rssi sensor
      const configRssiTopic = this.discovery_prefix + "/sensor/" + id + "/rssi/config";
      const rssiPayload = {
        unique_id: "ttlock_" + id + "_rssi",
        name: name + " RSSI",
        device: device,
        unit_of_measurement: "dB",
        icon: "mdi:signal",
        state_topic: "ttlock/" + id,
        value_template: "{{ value_json.rssi }}",
      }
      console.log("MQTT Publish", configRssiTopic, JSON.stringify(rssiPayload));
      res = await this.client.publish(configRssiTopic, JSON.stringify(rssiPayload));

      this.configuredLocks.add(lock.getAddress());
    }
  }

  /**
   * Update the readings of a lock in HA
   * @param {import('ttlock-sdk-js').TTLock} lock 
   */
  async updateLockState(lock) {
    if (this.connected) {
      const id = this.getLockId(lock);
      const stateTopic = "ttlock/" + id;
      const lockedStatus = await lock.getLockStatus();
      const statePayload = {
        battery: lock.getBattery(),
        rssi: lock.getRssi(),
        state: lockedStatus == LockedStatus.LOCKED ? "LOCK" : "UNLOCK"
      }

      console.log("MQTT Publish", stateTopic, JSON.stringify(statePayload));
      const res = await this.client.publish(stateTopic, JSON.stringify(statePayload));
    }
  }

  /**
   * 
   * @param {import('ttlock-sdk-js').TTLock} lock 
   */
  async _onLockPaired(lock) {
    await this.configureLock(lock);
  }

  /**
   * 
   * @param {import('ttlock-sdk-js').TTLock} lock 
   */
  async _onLockConnected(lock) {
    await this.configureLock(lock);
    await this.updateLockState(lock);
  }

  /**
   * 
   * @param {import('ttlock-sdk-js').TTLock} lock 
   */
  async _onLockUnlock(lock) {
    await this.updateLockState(lock);
  }

  /**
   * 
   * @param {import('ttlock-sdk-js').TTLock} lock 
   */
  async _onLockLock(lock) {
    await this.updateLockState(lock);
  }

  /**
   * 
   * @param {string} topic 
   * @param {Buffer} message 
   */
  _onMQTTMessage(topic, message) {
    /**
     * Topic: ttlock/e1581b3a605e/set
       Message: UNLOCK
     */
    let topicArr = topic.split("/");
    if (topicArr.length == 3 && topicArr[0] == "ttlock" && topicArr[2] == "set" && topicArr[1].length == 12) {
      let address = "";
      for (let i = 0; i < topicArr[1].length; i++) {
        address += topicArr[1][i];
        if (i < topicArr[1].length - 1 && i % 2 == 1) {
          address += ":";
        }
      }
      address = address.toUpperCase();
      const command = message.toString('utf8');
      console.log("MQTT command:", address, command);
      switch (command) {
        case "LOCK":
          this.manager.lockLock(address);
          break;
        case "UNLOCK":
          this.manager.unlockLock(address);
          break;
      }
    } else {
      console.log("Topic:", topic);
      console.log("Message:", message.toString('utf8'));
    }
  }
}

module.exports = HomeAssistant;