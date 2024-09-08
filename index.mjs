import WebSocket from "ws";

// Get Bevi URL from command line
let url = process.argv[2];
url = url.replace("http", "ws");
url = url.replace("su20", "user-side");

if (!url?.startsWith("wss://bevitouchless.co/user-side/")) {
    console.error("Invalid URL.");
    process.exit(1);
}

// WebSocket Setup
const ws = new WebSocket(url);

ws.on("open", () => {
    ws.send(JSON.stringify({"cmd":"hash","value":"6b512c34-7305-4aa1-bce9-5c6a38016ad8"}));
    ws.send(JSON.stringify({"cmd": "ping", "value": Date.now()}));
});


// Operation
const IGNORED_COMMANDS = ["locale", "sparkling", "waters", "free_water_types"];
// Indexed by "position"
const FLAVORS = {
    1: { name: "Peach Mango", intensity: true },
    2: { name: "Raspberry", intensity: true },
    3: { name: "Grapefruit", intensity: true },
    4: { name: "Watermelon", intensity: true },
    5: { name: "Lemon", intensity: true },
    6: { name: "Electrolytes", intensity: false },
    7: { name: "Vitamin Boost", intensity: false },
    8: { name: "Blood Orange", intensity: true }
};

let flavorStatus = {};
let intensityStatus = {};
for (const position in FLAVORS) {
    flavorStatus[position] = false;
    if (FLAVORS[position].intensity) intensityStatus[position] = "MEDIUM";
}

let waterStatus = "DISPENSE_STILL";

let loopRunning = false;
let stopDispense = false;
const printDataPeriodic = () => {
    console.log("Water status:", waterStatus);
    console.log(Object.entries(flavorStatus).map(([position, status]) => {
        if (!status) return null;
        let data = `${FLAVORS[position].name}: ${status}`;
        if (FLAVORS[position].intensity) data += ` (${intensityStatus[position]})`;
        return data;
    }).filter(x => x !== null).join("\n"));
    console.log("----")
};

ws.on("message", (buf) => {
    const data = JSON.parse(buf.toString());

    switch (data.cmd) {
        // Basic operation commands
        case "pong":
            ws.send(JSON.stringify({"cmd": "ping_result", "value": 300, "warning": false}));
            if (!loopRunning) setInterval(printDataPeriodic, 10000);
            loopRunning = true;
            break;
        case "ping":
            ws.send(JSON.stringify({"cmd": "pong", "value": data.value}));
            break;
        case "ack":
            console.log("ack: ", data.value);
            break;
        // Data reporting
        case "water":
            waterStatus = data.value;
            break;
        case "pour":
            console.log(data);
            if (stopDispense) {
                stopDispense = false;
                ws.send(JSON.stringify({"cmd":"dispense","value":false,"position": 0}));
            }
            break;
        case "flavor":
            flavorStatus[data.position] = data.value;
            break;
        case "intensity":
            intensityStatus[data.position] = data.value;
            break;
        // Errors + Ignored
        case "error":
            console.error("Exiting with error:", data);
            process.exit(1);
            break;
        default:
            if (IGNORED_COMMANDS.includes(data.cmd)) break;
            console.log("Unknown command:", data.cmd);
            console.log(data);
            break;
    }
});