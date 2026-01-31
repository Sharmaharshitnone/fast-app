const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({server});

app.get('/', (req, res) =>{
	res.sendFile(__dirname + '/index.html');
});

wss.on('connection', function connection(ws){
	console.log('A new client connected');
	ws.send("Welcome to the Real-Time web!");

	ws.on('message', function incoming(message){
		console.log('received: %s', message);

		wss.clients.forEach(function each(client){
			if(client.readyState == WebSocket.OPEN){
				client.send(message.toString());
			}
		});

	});
});

server.listen(3000, () => console.log('Server ready'));
