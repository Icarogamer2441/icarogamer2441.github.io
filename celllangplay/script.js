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
            } else if (token === "#") {  // Novo token para comentários
                break;
            } else {
                output += `Unknown token: '${token}'. tokens: '>', '<', '*', '!', '&', '#'.\n`;
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
        alert("The code is empty!");
        return;
    }
    const filename = prompt("Enter a name for your file:");
    if (filename) {
        localStorage.setItem(filename, code);
        loadFiles();
    } else {
        alert("File not saved. No filename provided.");
    }
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

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const mode = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    localStorage.setItem('mode', mode);
}

function applyInitialMode() {
    const savedMode = localStorage.getItem('mode') || 'light';
    if (savedMode === 'dark') {
        document.body.classList.add('dark-mode');
    }
}

function importFile() {
    document.getElementById('file-input').click();
}

function loadFile(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function(event) {
        const code = event.target.result;
        document.getElementById('code').value = code;
    };
    reader.readAsText(file);
}

function exportFile() {
    const code = document.getElementById('code').value;
    const filename = prompt("Enter a filename to export:");
    if (filename) {
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

window.onload = () => {
    loadFiles();
    applyInitialMode();
};
