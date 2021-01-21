# Changelog

## [0.2.28] - 2020-01-21
- Bump SDK for fixing gateway disconnection issues

## [0.2.24] - 2020-01-20
- Bump SDK for switch feature fix and remote unlock error during pairing
- Stop scan after a new unpaired lock is found
- Option to debug gateway messages (`gateway_debug: true` in config)

## [0.2.21] - 2020-01-17
- Bump SDK for stability fixes

## [0.2.19] - 2020-01-16
- Auto-lock management

## [0.2.16] - 2020-01-16
- Basic config editing UI for saving/restoring lock pairing data
- Option for communication debug (`debug_communication: true` in config)

## [0.2.12] - 2020-01-16
- Persist device state between HA restarts
- Option for MQTT debug (`debug_mqtt: true` in config)

## [0.2.11] - 2021-01-15
- Filter credentials type availability based on lock features
- Force noble in websocket mode to avoid missing BLE adapter
- Unstable connection fixes from SDK
- Status updates to all clients
- Reduce scan interval
- Option to ignore CRC errors (`ignore_crc: true` in config)

## [0.2.7] - 2021-01-12
- Add support for BLE Gateway (not TTLock G2 gateway)

## [0.1.1] - 2021-01-08
- Possible fix for discovering unpaired locks
- Debug found locks

## [0.1.0] - 2021-01-05
Initial release