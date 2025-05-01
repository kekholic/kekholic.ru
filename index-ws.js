const express = require('express');
const server = require('http').createServer();
const app = express();
const PORT = 3000;

app.get('/', function(req, res) {
    res.sendFile('index.html', {root: __dirname});
});

server.on('request', app);
server.listen(PORT, function () { console.log('Listening on ' + PORT); });

/** Websocket **/
const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ server: server }); // connected to express server

process.on('SIGINT', () => {
    console.log('sigint');

    const forceExit = setTimeout(() => {
      console.log('Forcing exit after timeout');
      process.exit(1);
  }, 5000);


    wss.clients.forEach(function each(client) {
        client.close();
    });

    wss.close(() => {
      console.log('WebSocket server closed');
      
      server.close(() => {
        clearTimeout(forceExit); // отменяем таймаут
        shutdownDB();
    });
  });
})


wss.on('connection', function connection(ws) {
    const numClients = wss.clients.size;

    console.log('clients connected: ', numClients);

    wss.broadcast(`Current visitors: ${numClients}`);

    if (ws.readyState === ws.OPEN) {
    ws.send('welcome!');
    }

    db.run(`INSERT INTO visitors (count, time)
        VALUES (${numClients}, datetime('now'))
    `);

    ws.on('close', function close() {
        wss.broadcast(`Current visitors: ${numClients}`);
        console.log('A client has disconnected');
    });

});

wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
        client.send(data);
    });
}

/** End Websocket **/

/** Begin database */
const sqlite = require('sqlite3');
const db = new sqlite.Database(':memory:');

db.serialize(() => {
    db.run(`
        CREATE TABLE visitors (
            count INTEGER,
            time TEXT
        )
    `)
});

function getCounts() {
    db.each("SELECT * FROM visitors", (err, row) => {
        console.log(row);
    });
}

function shutdownDB() {
    console.log('Shutting down db');

    getCounts();
    db.close();

}
