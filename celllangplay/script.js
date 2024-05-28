const cells = {
    0: "\n", 1: "a", 2: "b", 3: "c", 4: "d", 5: "e", 6: "f", 7: "g", 8: "h", 9: "i", 10: "j", 11: "k",
    12: "l", 13: "m", 14: "n", 15: "o", 16: "p", 17: "q", 18: "r", 19: "s", 20: "t", 21: "u", 22: "v", 23: "w",
    24: "x", 25: "y", 26: "z", 27: " ", 28: "{", 29: "}", 30: "(", 31: ")", 32: ".", 33: ",", 34: ";", 35: "*",
    36: "+", 37: "-", 38: "[", 39: "]", 40: "!", 41: "?", 42: "&", 43: "$", 44: "@", 45: "#", 46: "\"", 47: "'",
    48: "^", 49: "~", 50: "%", 51: "=", 52: "°", 53: "/", 54: "|", 55: "\\", 56: "_", 57: "<", 58: ">", 59: ":",
    60: "1", 61: "2", 62: "3", 63: "4", 64: "5", 65: "6", 66: "7", 67: "8", 68: "9", 69: "0", 70: "\t"
};

function interpret(code) {
    const lines = code.split("\n");
    let cellpos = 0;
    let output = "";

    for (const line of lines) {
        const tokens = line.split("");

        for (const token of tokens) {
            if (token === ">") {
                cellpos += 1;
            } else if (token === "<") {
                cellpos -= 1;
            } else if (token === "*") {
                if (cells[cellpos] !== undefined) {
                    output += cells[cellpos];
                }
            } else if (token === "!") {
                if (cells[cellpos] !== undefined) {
                    output += cells[cellpos].toUpperCase();
                }
            } else if (token === "&") {
                output += cellpos;
            } else {
                output += `Unknown token: '${token}'. tokens: '>', '<', '*', '!', '&'.\n`;
            }
        }
    }
    
    return output;
}

function executeCode() {
    const code = document.getElementById("code").value;
    const output = interpret(code);
    document.getElementById("output").textContent = output;
}

function saveCode() {
    const code = document.getElementById("code").value;
    if (code.trim() === "") {
        alert("O código está vazio!");
        return;
    }
    const timestamp = new Date().toLocaleString();
    localStorage.setItem(timestamp, code);
    loadFiles();
}

function loadFiles() {
    const fileList = document.getElementById("file-list");
    fileList.innerHTML = "";
    Object.keys(localStorage).forEach(key => {
        const li = document.createElement("li");
        li.textContent = key;
        li.onclick = () => loadCode(key);
        fileList.appendChild(li);
    });
}

function loadCode(key) {
    const code = localStorage.getItem(key);
    document.getElementById("code").value = code;
}

function clearFiles() {
    localStorage.clear();
    loadFiles();
}

// Carrega os arquivos salvos ao carregar a página
window.onload = loadFiles;
