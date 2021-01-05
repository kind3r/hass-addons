#!/usr/bin/env bashio

export MQTT_HOST=$(bashio::services mqtt "host")
export MQTT_PORT=$(bashio::services mqtt "port")
export MQTT_SSL=$(bashio::services mqtt "ssl")
export MQTT_USER=$(bashio::services mqtt "username")
export MQTT_PASS=$(bashio::services mqtt "password")

cd /app
npm start