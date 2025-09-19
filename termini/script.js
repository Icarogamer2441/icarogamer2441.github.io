// ===== Sistema de arquivos básico =====
let fileSystem = JSON.parse(localStorage.getItem('terminiFS')) || { '/': {} };
let currentPath = '/';
let commandHistory = [];
let historyIndex = -1;
let terminalType = localStorage.getItem('terminiType') || 'pc';

// ===== Funções utilitárias =====
function saveFS() {
    localStorage.setItem('terminiFS', JSON.stringify(fileSystem));
}

function saveType() {
    localStorage.setItem('terminiType', terminalType);
}

function getPrompt() {
    return `[${currentPath}@root] $`;
}

function resolvePath(path) {
    if (path.startsWith('/')) return path;
    if (currentPath === '/') return '/' + path;
    return currentPath + '/' + path;
}

function listDir(path) {
    let node = fileSystem['/'];
    if (path !== '/') {
        let parts = path.split('/').filter(Boolean);
        for (let part of parts) {
            if (!node[part]) return null;
            node = node[part];
        }
    }
    return node;
}

// ===== Comandos =====
const commands = {
    help: () => `Comandos disponíveis: help, ls, cd, mkdir, touch, cat, echo, deleteall, pwd, type mobile/pc`,
    ls: (args) => {
        let path = args[0] ? resolvePath(args[0]) : currentPath;
        let dir = listDir(path);
        if (!dir) return `ls: diretório não encontrado`;
        return Object.keys(dir).join(' ');
    },
    cd: (args) => {
        let path = args[0] ? resolvePath(args[0]) : '/';
        if (listDir(path)) {
            currentPath = path;
            return '';
        } else {
            return `cd: diretório não encontrado`;
        }
    },
    mkdir: (args) => {
        if (!args[0]) return `mkdir: nome do diretório necessário`;
        let path = resolvePath(args[0]);
        let parts = path.split('/').filter(Boolean);
        let node = fileSystem['/'];
        for (let i = 0; i < parts.length - 1; i++) {
            if (!node[parts[i]]) node[parts[i]] = {};
            node = node[parts[i]];
        }
        node[parts[parts.length - 1]] = {};
        saveFS();
        return '';
    },
    touch: (args) => {
        if (!args[0]) return `touch: nome do arquivo necessário`;
        let path = resolvePath(args[0]);
        let parts = path.split('/').filter(Boolean);
        let node = fileSystem['/'];
        for (let i = 0; i < parts.length - 1; i++) {
            if (!node[parts[i]]) node[parts[i]] = {};
            node = node[parts[i]];
        }
        node[parts[parts.length - 1]] = '';
        saveFS();
        return '';
    },
    cat: (args) => {
        if (!args[0]) return `cat: nome do arquivo necessário`;
        let path = resolvePath(args[0]);
        let parts = path.split('/').filter(Boolean);
        let node = fileSystem['/'];
        for (let i = 0; i < parts.length; i++) {
            if (!node[parts[i]]) return `cat: arquivo não encontrado`;
            node = node[parts[i]];
        }
        return node || '';
    },
    echo: (args) => {
        if (args.length < 2) return `echo: uso correto echo "conteudo" filename`;
        let content = args.slice(0, args.length-1).join(' ').replace(/^"|"$/g, '');
        let filename = args[args.length-1];
        let path = resolvePath(filename);
        let parts = path.split('/').filter(Boolean);
        let node = fileSystem['/'];
        for (let i = 0; i < parts.length - 1; i++) {
            if (!node[parts[i]]) node[parts[i]] = {};
            node = node[parts[i]];
        }
        node[parts[parts.length - 1]] = content;
        saveFS();
        return '';
    },
    pwd: () => currentPath,
    deleteall: () => {
        fileSystem = {'/': {}};
        currentPath = '/';
        saveFS();
        return 'Sistema de arquivos resetado!';
    },
    type: (args) => {
        if (!args[0]) return `type: mobile ou pc necessário`;
        if (args[0] === 'mobile' || args[0] === 'pc') {
            terminalType = args[0];
            saveType();
            return `Terminal configurado para ${terminalType}`;
        } else {
            return `type: opção inválida (use mobile ou pc)`;
        }
    }
};

// ===== Interação com o terminal =====
const input = document.getElementById('input');
const output = document.getElementById('output');
const promptSpan = document.getElementById('prompt');

function updatePrompt() {
    promptSpan.textContent = getPrompt();
}

function printOutput(text) {
    const line = document.createElement('div');
    line.textContent = text;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
}

// ===== Histórico de comandos =====
input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const commandLine = input.value.trim();
        printOutput(getPrompt() + ' ' + commandLine);
        if (commandLine) {
            commandHistory.push(commandLine);
            historyIndex = commandHistory.length;
            const [cmd, ...args] = commandLine.split(' ');
            if (commands[cmd]) {
                const result = commands[cmd](args);
                if (result) printOutput(result);
            } else {
                printOutput(`${cmd}: comando não encontrado`);
            }
        }
        input.value = '';
        updatePrompt();
    } else if (e.key === 'ArrowUp') {
        if (historyIndex > 0) {
            historyIndex--;
            input.value = commandHistory[historyIndex];
        }
    } else if (e.key === 'ArrowDown') {
        if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            input.value = commandHistory[historyIndex];
        } else {
            historyIndex = commandHistory.length;
            input.value = '';
        }
    }
});

// ===== Inicialização =====
updatePrompt();