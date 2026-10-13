# AgriRover secure public dashboard

## Files
- `server.js`: Express web server, HiveMQ MQTT subscriber, WebSocket relay to browsers.
- `public/index.html`: responsive dashboard. It contains no MQTT username/password.
- `.env.example`: environment-variable template with placeholders only.

## Architecture
ESP32 -> HiveMQ Cloud (TLS MQTT port 8883) -> this Node.js backend -> browser dashboard (WSS `/ws`). The browser never receives the HiveMQ credentials. This dashboard relay is read-only; it does not let visitors publish MQTT commands.

## Deploy
Deploy this project as a Node.js web service on a host that supports persistent WebSocket connections, such as Render Web Service or Railway.
- Build command: `npm install`
- Start command: `npm start`
- Node.js: 20 or newer
- Root directory: directory containing `package.json`

In the host's Environment Variables/Secrets panel, add:
- `MQTT_HOST`: HiveMQ Cloud cluster hostname only (no `mqtts://`)
- `MQTT_PORT`: `8883`
- `MQTT_USERNAME`: a dedicated backend-only HiveMQ user
- `MQTT_PASSWORD`: password for that user
- `MQTT_SENSOR_TOPIC`: `agrirover/sensors`
- `MQTT_STATUS_TOPIC`: `agrirover/status`

The host supplies `PORT`. Do not commit a real `.env` file or put the backend password in HTML. Create a dedicated HiveMQ account with only the subscribe permissions the backend needs. Rotate credentials that were shared publicly.

After deployment, open the HTTPS URL from the host. The page automatically connects to `wss://YOUR-HOST/ws`; no manual credential entry is needed. Test `/health` for `{"ok":true,"service":"agr-rover-dashboard"}`.

ESP32 should publish JSON on `agrirover/sensors` with keys `soil_raw`, `soil_percent`, `soil_status`, `mq135_raw`, `temperature`, `humidity`, `wifi_rssi`. Status topic `agrirover/status` can publish `online`/`offline`.

Anyone with the public URL can view telemetry, so do not publish private data. For a team-only dashboard, add authentication. `mq135_raw` is raw ADC, not a calibrated AQI value.
