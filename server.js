const path = require('path');
const http = require('http');
const express = require('express');
const mqtt = require('mqtt');
const WebSocket = require('ws');
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.MQTT_HOST;
const MQTT_PORT = Number(process.env.MQTT_PORT || 8883);
const USER = process.env.MQTT_USERNAME;
const PASS = process.env.MQTT_PASSWORD;
const SENSOR_TOPIC = process.env.MQTT_SENSOR_TOPIC || 'agrirover/sensors';
const STATUS_TOPIC = process.env.MQTT_STATUS_TOPIC || 'agrirover/status';
if (!HOST || !USER || !PASS) { console.error('Set MQTT_HOST, MQTT_USERNAME and MQTT_PASSWORD as environment variables.'); process.exit(1); }
const app = express(); app.disable('x-powered-by');
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');next()});
app.use(express.static(path.join(__dirname,'public')));
app.get('/health',(_req,res)=>res.json({ok:true,service:'agr-rover-dashboard'}));
const server=http.createServer(app); const wss=new WebSocket.Server({server,path:'/ws'}); const clients=new Set(); let latest=null,online=false;
function send(ws,obj){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj))} function broadcast(obj){for(const ws of clients)send(ws,obj)}
wss.on('connection',ws=>{clients.add(ws);send(ws,{type:'status',online});if(latest)send(ws,{type:'sensor',data:latest});ws.on('close',()=>clients.delete(ws));ws.on('error',()=>clients.delete(ws))});
const client=mqtt.connect(`mqtts://${HOST}:${MQTT_PORT}`,{username:USER,password:PASS,clientId:`agr-rover-backend-${Math.random().toString(16).slice(2,10)}`,clean:true,reconnectPeriod:3000,connectTimeout:15000,keepalive:30,rejectUnauthorized:true});
client.on('connect',()=>{console.log('Connected to HiveMQ Cloud');client.subscribe([SENSOR_TOPIC,STATUS_TOPIC],err=>{if(err)console.error('Subscribe error:',err.message);else console.log('Subscribed to sensor/status topics')})});client.on('reconnect',()=>console.log('Reconnecting to HiveMQ…'));client.on('error',e=>console.error('MQTT error:',e.message));
client.on('message',(topic,buf)=>{const value=buf.toString();if(topic===STATUS_TOPIC){online=value.trim().toLowerCase()==='online';broadcast({type:'status',online});return}if(topic!==SENSOR_TOPIC)return;try{latest=JSON.parse(value);online=true;broadcast({type:'sensor',data:latest});broadcast({type:'status',online:true})}catch{console.warn('Ignored invalid JSON on sensor topic')}});
server.listen(PORT,'0.0.0.0',()=>console.log(`Dashboard listening on port ${PORT}`));
function shutdown(){client.end(true);for(const ws of clients)ws.close();server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),5000).unref()}process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
