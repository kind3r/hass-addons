# Home Assistant Add-on TTLock

> This is a **WORK IN PROGRESS**. Help with testing and report bugs [here](https://github.com/kind3r/hass-addons/issues).

Feeling generous and want to support my work, here is [my PayPal link](https://paypal.me/kind3r).

## Requirements
- Bluetooth adapter compatible with [@abandonware/noble](https://github.com/abandonware/noble)
- MQTT broker (optional but recommended if you want to report lock status in HA and use it for automations)

## Features
- Ingress Web UI for
  - Pair new lock
  - Lock / unlock
  - Add / edit PIN codes
  - Add / remove IC Cards
  - Add / remove fingerprints
- (optional) HA reporting and controling via `lock` domain device using MQTT discovery
  - Signal level
  - Battery level
  - Lock/unlock status

## Screenshots

### Lock list  
![Lock list](https://github.com/kind3r/hass-addons/raw/master/ttlock-hass-integration/img/frontend1.png)  

### Credentials  
![Credentials](https://github.com/kind3r/hass-addons/raw/master/ttlock-hass-integration/img/frontend2.png)  

### Add fingerprint  
![Add fingerprint](https://github.com/kind3r/hass-addons/raw/master/ttlock-hass-integration/img/frontend3.png)  

### HA device
![HA device](https://github.com/kind3r/hass-addons/raw/master/ttlock-hass-integration/img/ha1.png)  

