const process = require("process");
const brain = require("brain.js");
const fs = require("fs");

let malignity = parseInt(process.argv[2]);
let severity = parseInt(process.argv[3]);
let utility = parseInt(process.argv[4]);
let expectance = parseInt(process.argv[5]);

let net = new brain.NeuralNetwork();

net.fromJSON(JSON.parse(fs.readFileSync( "network.json")));

console.log(net.run(
    [
        malignity, severity, utility, expectance
    ]
) > 0.5 ? 1 : 0 )