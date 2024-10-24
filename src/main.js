const brain = require("brain.js");
const fs = require("fs");

// Shuffle array
function shuffle(arr) {
  let ret = [];
  for(let i=0;i<arr.length;i++) {
    let id = Math.floor( Math.random() * arr.length);

    console.log(id);
    ret.push(arr[id]);
    arr.splice(id, 1);
  }
  return ret;
}

// Set network variables
let net = null;
let netjson = null;

// Read in data
let ds = JSON.parse(fs.readFileSync("static/output.json"))
  .filter((x) => !x.command.includes("python"))
  .map((x) => {
    return {
      meta: {
        task: x.task,
        cmd: x.command,
      },
      input: [
        x.malignity_score,
        x.severity_score,
        x.utility_score,
        x.expectance_score,
      ],
      output: [x.expected_result == "admin" ? 0 : 1],
    };
  });

// Filter by role
let admins = ds.filter((x) => x.output[0] == 0);
let attackers = ds.filter((x) => x.output[0] == 1);

// Randomize dataset
ds = shuffle(
  [].concat(
    admins.slice(0, Math.min(admins.length, attackers.length)),
    attackers.slice(0, Math.min(admins.length, attackers.length)),
  ),
);

// Train-test split
const train = ds.slice(0, ds.length * 0.5);
const test = ds.slice(ds.length * 0.1);

// Read network from file if exists
if (fs.existsSync("network.json")) {
  // Create network from file
  net = new brain.NeuralNetwork();
  netjson = JSON.parse(fs.readFileSync("network.json"));
  net.fromJSON(netjson);

} else {

  // Create new network
  const config = {
    binaryThresh: 0.5,
    hiddenLayers: [4, 5],
    activation: "sigmoid",
  };

  // Train network
  net = new brain.NeuralNetwork(config);
  net.train(train);
  netjson = net.toJSON();

  // Backup network
  fs.writeFileSync("network.json", JSON.stringify(netjson));
}

/*
  Confusion Matrix
  [ TP, FN ]
  [ FP, TN ]
*/
let matrix = [
  // P, N
  [0, 0],
  [0, 0],
];

// Test predictions
for (let sample of test) {
  let prediction = net.run(sample.input) > 0.9 ? 1 : 0;
  let expected = sample.output[0];
  if (expected == 0) {
    if (prediction == 0) {
      // True positive
      matrix[0][0] += 1;
    } else {
      // False negative
      matrix[0][1] += 1;
    }
  } else {
    if (prediction == 1) {
      // True negative
      matrix[1][1] += 1;
    } else {
      // False positive
      matrix[1][0] += 1;
    }
  }
}

// Output matrix
console.log(`  CONFUSION MATRIX`);
console.table(matrix);
