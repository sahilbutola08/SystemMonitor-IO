const { WebSocketServer } = require("ws");

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
    console.log("client connected");

    const interval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
            const metricsPayload = {
                timestamp: Date.now(),
                cpu: Math.floor(Math.random() * 30) + 40,
                memory: Math.floor(Math.random() * 15) + 60,
                log: `[INFO] Request processed in ${Math.floor(Math.random() * 40) + 10}ms - Status 200`
            }

            ws.send(JSON.stringify(metricsPayload));
        }
    }, 10);

    ws.on("close", () => {
        console.log("client disconnected");
        clearInterval(interval);
    })
})