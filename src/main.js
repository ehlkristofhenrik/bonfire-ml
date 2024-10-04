const brain = require("brain.js");
const fs = require("fs");

// Thanks to https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
  let currentIndex = array.length;

  while (currentIndex != 0) {
    let randomIndex = Math.floor(Math.random() * currentIndex);

    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

let net = null;
let netjson = null;

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

let admins = ds.filter((x) => x.output[0] == 0);
let attackers = ds.filter((x) => x.output[0] == 1);

ds = shuffle(
  [].concat(
    admins.slice(0, Math.min(admins.length, attackers.length)),
    attackers.slice(0, Math.min(admins.length, attackers.length)),
  ),
);

const train = ds.slice(0, ds.length * 0.5);
const test = ds.slice(ds.length * 0.1);

// console.log(train, test);

if (fs.existsSync("network.json")) {
  net = new brain.NeuralNetwork();
  netjson = JSON.parse(fs.readFileSync("network.json"));
  net.fromJSON(netjson);
} else {
  const config = {
    binaryThresh: 0.5,
    hiddenLayers: [4, 5],
    activation: "sigmoid", // supported activation types: ['sigmoid', 'relu', 'leaky-relu', 'tanh'],
  };

  net = new brain.NeuralNetwork(config);

  net.train(train);
  netjson = net.toJSON();
  fs.writeFileSync("network.json", JSON.stringify(netjson));
}

/*
[ TP, FN ]
[ FP, TN ]
*/

let matrix = [
  // P, N
  [0, 0],
  [0, 0],
];

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

console.log(`  CONFUSION MATRIX`);
console.table(matrix);
