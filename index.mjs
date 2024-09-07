import WebSocket from "ws";

// Get Bevi URL from command line
let url = process.argv[2];
url = url.replace("http", "ws");
url = url.replace("su20", "user-side");

if (!url?.startsWith("wss://bevitouchless.co/user-side/")) {
    console.error("Invalid URL.");
    process.exit(1);
}

const ws = new WebSocket(url);

ws.on("open", () => {
    ws.send(JSON.stringify({"cmd":"hash","value":"6b512c34-7305-4aa1-bce9-5c6a38016ad8"}));
    ws.send(JSON.stringify({"cmd": "ping", "value": Date.now()}));
});

ws.on("message", (buf) => {
    const data = JSON.parse(buf.toString());

    console.log(data.cmd, data)
    switch (data.cmd) {
        case "pong":
            ws.send(JSON.stringify({"cmd": "ping_result", "value": 300, "warning": false}));
            ws.send(JSON.stringify({"cmd":"flavor","value":true,"position":5}));
            break;
        case "ping":
            ws.send(JSON.stringify({"cmd": "pong", "value": data.value}));
            break;
        case "ack":
            console.log("ack: ", data.value);
            break;
        case "error":
            console.error("Exiting with error:", data);
            process.exit(1);
            break;
        default:
            console.log("Unknown command:", data.cmd);
            console.log(data);
            break;
    }
});