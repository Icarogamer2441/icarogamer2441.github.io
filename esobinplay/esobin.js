let bin0 = [0];
let bin1 = [0];

let dataspos = {
  a: "", b: "", c: "", d: "", e: "", f: "", g: "", h: "", i: "", j: "", k: "",
  l: "", m: "", n: "", o: "", p: "", q: "", r: "", s: "", t: "", u: "", v: "",
  w: "", x: "", y: "", z: ""
};

function interpret(code) {
  let lines = code.split("\n");

  for (let line of lines) {
    let tokens = Array.from(line);

    try {
      if (tokens[0] === "3") {
        // No operation
      } else if (tokens[0] === "4") {
        let times = parseInt(tokens[1]);
        for (let i = 0; i < times; i++) {
          let finalcode = tokens.slice(2).join("");
          interpret(finalcode);
        }
      } else if (tokens[0] === "5") {
        let datapos = tokens[1];
        if (bin1[0] === 3 && bin0[0] === 3) {
          if (dataspos.hasOwnProperty(datapos)) {
            dataspos[datapos] = prompt(`Input for ${datapos}:`);
          }
        } else if (bin1[0] === 6 && bin0[0] === 6) {
          if (dataspos.hasOwnProperty(datapos)) {
            document.getElementById("output").innerText += dataspos[datapos];
          }
        } else {
          let value = tokens.slice(2).join("");
          if (dataspos.hasOwnProperty(datapos)) {
            dataspos[datapos] = value;
          }
        }
        bin0[0] = 0;
        bin1[0] = 0;
      } else if (tokens[0] === "7") {
        let datapos = tokens[1];
        if (dataspos.hasOwnProperty(datapos)) {
          interpret(dataspos[datapos]);
        }
      } else {
        for (let token of tokens) {
          if (token === "1") {
            bin1[0] += 1;
          } else if (token === "0") {
            bin0[0] += 1;
          } else if (token === "2") {
            handleBin(bin1[0], bin0[0]);
            bin0[0] = 0;
            bin1[0] = 0;
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
}

function handleBin(bin1, bin0) {
  const outputMap = {
    "1_2": "a", "2_1": "b", "5_3": "c", "3_3": "d", "4_1": "e",
    "6_2": "f", "7_1": "g", "7_2": "h", "8_3": "i", "8_5": "j",
    "8_6": "k", "9_6": "l", "9_3": "m", "9_2": "n", "9_5": "o",
    "10_1": "p", "10_2": "q", "10_3": "r", "10_4": "s", "11_2": "t",
    "11_3": "u", "11_4": "v", "11_5": "w", "12_1": "x", "12_3": "y",
    "12_6": "z", "13_1": " ", "13_2": "\n", "13_3": "!", "13_4": "?",
    "13_5": ".", "13_6": "*", "13_7": "\"", "13_8": "'", "13_9": "+",
    "13_10": "-", "14_1": "/", "14_2": ",", "14_3": "*", "14_4": "&",
    "14_8": "$", "14_9": "%", "14_10": ">", "14_11": "<", "14_12": ":",
    "14_13": ";", "15_1": "1", "15_2": "2", "15_3": "3", "15_4": "4",
    "15_5": "5", "15_6": "6", "15_7": "7", "15_8": "8", "15_9": "9",
    "15_10": "0"
  };

  let key = `${bin1}_${bin0}`;
  if (outputMap[key]) {
    document.getElementById("output").innerText += outputMap[key];
  }
}

document.getElementById("runButton").addEventListener("click", () => {
  let code = document.getElementById("codeInput").value;
  document.getElementById("output").innerText = "";
  interpret(code);
});

function promptInput(message) {
  return prompt(message);
}
