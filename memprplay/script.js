document.getElementById('runButton').addEventListener('click', () => {
    const code = document.getElementById('codeInput').value;
    const outputElement = document.getElementById('output');
    outputElement.textContent = '';
    interpret(code, outputElement);
});

async function interpret(code, outputElement) {
    const lines = code.split("\n");
    let memory = 26;
    let inp = [""];

    for (let line of lines) {
        const tokens = Array.from(line);

        if (tokens[0] === "#") {
            continue;
        } else {
            for (let token of tokens) {
                switch (token) {
                    case "*":
                        memory += 5;
                        break;
                    case "+":
                        memory += 1;
                        break;
                    case "-":
                        memory -= 1;
                        break;
                    case "!":
                        memory -= 5;
                        break;
                    case "&":
                        outputElement.textContent += getCharFromMemory(memory);
                        break;
                    case "%":
                        outputElement.textContent += memory + '\n';
                        break;
                    case "@":
                        await handleInput(outputElement, inp);
                        break;
                    case ".":
                        outputElement.textContent += inp[0];
                        break;
                }
            }
        }
    }
}

function handleInput(outputElement, inp) {
    return new Promise((resolve) => {
        const inputElement = document.createElement('input');
        inputElement.type = 'text';
        outputElement.appendChild(inputElement);
        inputElement.focus();

        inputElement.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                inp[0] = inputElement.value;
                outputElement.removeChild(inputElement);
                resolve();
            }
        });
    });
}

function getCharFromMemory(memory) {
    const charMap = {
        26: "a", 25: "b", 24: "c", 23: "d", 22: "e", 21: "f", 20: "g", 19: "h", 18: "i",
        17: "j", 16: "k", 15: "l", 14: "m", 13: "n", 12: "o", 11: "p", 10: "q", 9: "r",
        8: "s", 7: "t", 6: "u", 5: "v", 4: "w", 3: "x", 2: "y", 1: "z", 27: " ", 28: "\n",
        29: "!", 30: "?", 31: ",", 32: ".", 33: "+", 34: "-", 35: "*", 36: "&", 37: "{",
        38: "}", 39: "%", 40: "[", 41: "]", 42: "=", 43: ";", 44: ":", 45: "#", 46: "$",
        47: "\"", 48: "'", 49: "~", 50: "0", 51: "1", 52: "2", 53: "3", 54: "4", 55: "5",
        56: "6", 57: "7", 58: "8", 59: "9", 60: ">", 61: "<", 62: "(", 63: ")", 64: "^"
    };

    return charMap[memory] || '';
}
