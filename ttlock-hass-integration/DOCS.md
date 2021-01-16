## How to use
- Install addon (it will take a while to build the docker image, be patient)
- (optional) Install an MQTT broker addon (such as Mosquitto)
- (optional) Configure gateway options (see below)
- Open Web UI (from Supervisor -> TTLock or from the sidebar)
- Pair a lock (lock needs to be awake when starting the addon or running a BLE scan manually and during pairing, to keep the lock awake just touch the keyboard)
- If you installed the MQTT broker the device should now be visibile as a `lock`

## Known issues
- Low BLE signal (which seems to be the case in general) can lead to
  - sometimes failing to pair the lock (make sure you can reset it to factory defaults)
  - failure to read all credentials
  - failure to discover paired locks at startup
- Unable to edit fingerprint validity inteval
- Cannot set autolock time
- Can't save or edit the locks secret store file in order to migrate to another installation (but this can be achieved via HA's snapshots feature)

## Gateway options

If your HA host does not have a Bluetooth adapter, you can use another computer/PI as a gateway.  

Use the Configure tab to specify gateway options:
```yaml
gateway: "noble"
gateway_host: "192.168.1.10"
gateway_port: 80
gateway_key: "00112233445566778899aabbccddeeff"
gateway_user: "admin"
gateway_pass: "admin"
```

Please see [ttlock-sdk-js Gateway option](https://github.com/kind3r/ttlock-sdk-js#gateway-option) for running an example gateway server. I am currently working on porting this server to run on ESP32 devices.  

## Other options

Sometimes the lock just does not want to send the right CRC even tho the packet contains the proper data. In such cases enabling `ignore_crc` will tell the addon not to fail when bad CRC messages are received.  

```yaml
ignore_crc: true // ignore bad CRC in responses from lock
debug_mqtt: true // log MQTT messages sent and received
```



