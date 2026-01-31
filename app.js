const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({server});

// Trading Dashboard State
let currentPrice = 67842.50;
let candlestickData = [];

// Initialize candlestick data
function generateInitialCandlesticks() {
	const data = [];
	let price = 67000;
	const now = Date.now();
	
	for (let i = 60; i >= 0; i--) {
		const time = now - i * 3600000;
		const open = price;
		const change = (Math.random() - 0.48) * 500;
		const close = open + change;
		const high = Math.max(open, close) + Math.random() * 200;
		const low = Math.min(open, close) - Math.random() * 200;
		const volume = Math.random() * 1000 + 500;
		
		data.push({ time, open, high, low, close, volume });
		price = close;
	}
	currentPrice = price;
	return data;
}
candlestickData = generateInitialCandlesticks();

// Generate order book
function generateOrderBook() {
	const asks = [];
	const bids = [];
	let askPrice = currentPrice + 5;
	let bidPrice = currentPrice - 5;
	
	for (let i = 0; i < 12; i++) {
		asks.push({
			price: askPrice + i * 10 + Math.random() * 5,
			size: Math.random() * 2 + 0.1,
			total: 0
		});
		bids.push({
			price: bidPrice - i * 10 - Math.random() * 5,
			size: Math.random() * 2 + 0.1,
			total: 0
		});
	}
	
	let askTotal = 0, bidTotal = 0;
	asks.reverse().forEach(a => { askTotal += a.size; a.total = askTotal; });
	asks.reverse();
	bids.forEach(b => { bidTotal += b.size; b.total = bidTotal; });
	
	return { asks, bids };
}

// Generate trade
function generateTrade() {
	const side = Math.random() > 0.5 ? 'buy' : 'sell';
	const price = currentPrice + (Math.random() - 0.5) * 20;
	const size = Math.random() * 0.5 + 0.01;
	const time = new Date().toLocaleTimeString('en-US', { hour12: false });
	
	return { type: 'trade', side, price, size, time };
}

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html');
});

wss.on('connection', function connection(ws) {
	console.log('A new trading client connected');
	
	// Send welcome message with current state
	ws.send(JSON.stringify({
		type: 'welcome',
		message: 'Connected to NEON TERMINAL Trading System',
		price: currentPrice
	}));

	// Handle incoming messages
	ws.on('message', function incoming(message) {
		console.log('received: %s', message);

		// Broadcast to all clients
		wss.clients.forEach(function each(client) {
			if (client.readyState === WebSocket.OPEN) {
				client.send(message.toString());
			}
		});
	});
	
	ws.on('close', () => {
		console.log('Trading client disconnected');
	});
});

// Real-time market data simulation
setInterval(() => {
	// Update price
	const priceChange = (Math.random() - 0.48) * 50;
	currentPrice += priceChange;
	const totalChange = ((currentPrice - 67000) / 67000) * 100;
	
	// Update last candle
	const lastCandle = candlestickData[candlestickData.length - 1];
	lastCandle.close = currentPrice;
	lastCandle.high = Math.max(lastCandle.high, currentPrice);
	lastCandle.low = Math.min(lastCandle.low, currentPrice);
	
	// Broadcast updates to all clients
	wss.clients.forEach(client => {
		if (client.readyState === WebSocket.OPEN) {
			// Send price update
			client.send(JSON.stringify({
				type: 'price',
				price: currentPrice,
				change: totalChange
			}));
			
			// Occasionally send order book update
			if (Math.random() > 0.7) {
				client.send(JSON.stringify({
					type: 'orderbook',
					...generateOrderBook()
				}));
			}
			
			// Occasionally send trade
			if (Math.random() > 0.5) {
				client.send(JSON.stringify(generateTrade()));
			}
		}
	});
}, 500);

// Generate new candle every minute
setInterval(() => {
	const lastCandle = candlestickData[candlestickData.length - 1];
	const newCandle = {
		time: Date.now(),
		open: lastCandle.close,
		high: lastCandle.close,
		low: lastCandle.close,
		close: lastCandle.close,
		volume: Math.random() * 1000 + 500
	};
	
	candlestickData.push(newCandle);
	candlestickData.shift();
	
	wss.clients.forEach(client => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(JSON.stringify({
				type: 'candle',
				...newCandle
			}));
		}
	});
}, 60000);

server.listen(3000, () => console.log('NEON TERMINAL Server running on port 3000'));
