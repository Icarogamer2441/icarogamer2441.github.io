// ===== Sistema de arquivos básico =====
let fileSystem = JSON.parse(localStorage.getItem('terminiFS')) || {
    '/': {
        docs: {
            'asm.doc': 'Assembly Termini:\nComandos: PRINT "texto", ADD <n1> <n2>, SUB <n1> <n2>',
            'bytecode.doc': 'Bytecode Termini:\nComandos: PRINT, ADD, SUB'
        }
    }
};
let currentPath = '/';
let commandHistory = [];
let historyIndex = -1;
let terminalType = localStorage.getItem('terminiType') || 'pc';

// ===== Funções utilitárias =====
function saveFS() { localStorage.setItem('terminiFS', JSON.stringify(fileSystem)); }
function saveType() { localStorage.setItem('terminiType', terminalType); }
function getPrompt() { return `[${currentPath}@root] $`; }
function resolvePath(path) {
    if (path.startsWith('/')) return path;
    if (currentPath === '/') return '/' + path;
    return currentPath + '/' + path;
}
function listDir(path) {
    let node = fileSystem['/'];
    if (path !== '/') {
        let parts = path.split('/').filter(Boolean);
        for (let part of parts) { if (!node[part]) return null; node = node[part]; }
    }
    return node;
}
function getNode(path) {
    let node = fileSystem['/'];
    let parts = path.split('/').filter(Boolean);
    for (let part of parts) {
        if (!node[part]) return null;
        node = node[part];
    }
    return node;
}

// ===== Comandos =====
const commands = {
    help: () => `Comandos: help, ls, cd, mkdir, touch, cat, echo, deleteall, pwd, type mobile/pc, rm, cp, mv, run, clear, docs, asmc`,
    ls: (args) => { let dir = listDir(args[0] ? resolvePath(args[0]) : currentPath); return dir ? Object.keys(dir).join(' ') : `ls: diretório não encontrado`; },
    cd: (args) => { let path = args[0] ? resolvePath(args[0]) : '/'; if (listDir(path)) { currentPath = path; return ''; } return `cd: diretório não encontrado`; },
    mkdir: (args) => { if (!args[0]) return `mkdir: nome necessário`; let path = resolvePath(args[0]); let parts = path.split('/').filter(Boolean); let node = fileSystem['/']; for (let i = 0; i < parts.length-1; i++) { if (!node[parts[i]]) node[parts[i]] = {}; node = node[parts[i]]; } node[parts[parts.length-1]] = {}; saveFS(); return ''; },
    touch: (args) => { if (!args[0]) return `touch: nome necessário`; let path = resolvePath(args[0]); let parts = path.split('/').filter(Boolean); let node = fileSystem['/']; for (let i=0;i<parts.length-1;i++){ if(!node[parts[i]]) node[parts[i]] = {}; node=node[parts[i]];} node[parts[parts.length-1]]=''; saveFS(); return ''; },
    cat: (args) => { if(!args[0]) return `cat: nome necessário`; let node = getNode(resolvePath(args[0])); return node === undefined || typeof node === 'object' ? `cat: arquivo não encontrado ou diretório` : node; },
    echo: (args) => { if(args.length<2) return `echo: uso echo "conteudo" filename`; let content=args.slice(0,args.length-1).join(' ').replace(/^"|"$/g,''); let filename=args[args.length-1]; let path=resolvePath(filename); let parts=path.split('/').filter(Boolean); let node=fileSystem['/']; for(let i=0;i<parts.length-1;i++){ if(!node[parts[i]]) node[parts[i]]={}; node=node[parts[i]]; } node[parts[parts.length-1]]=content; saveFS(); return ''; },
    pwd: () => currentPath,
    deleteall: () => { fileSystem={'/':{}}; currentPath='/'; saveFS(); return 'Sistema de arquivos resetado!'; },
    type: (args) => { if(!args[0]) return `type: mobile ou pc necessário`; if(args[0]==='mobile'||args[0]==='pc'){ terminalType=args[0]; saveType(); return `Terminal configurado para ${terminalType}`; } return `type: opção inválida`; },
    rm: (args) => { if(!args[0]) return 'rm: arquivo ou diretório necessário'; let path=resolvePath(args[0]); let parts=path.split('/').filter(Boolean); let node=fileSystem['/']; for(let i=0;i<parts.length-1;i++){ if(!node[parts[i]]) return `rm: caminho não encontrado`; node=node[parts[i]]; } delete node[parts[parts.length-1]]; saveFS(); return ''; },
    cp: (args) => { if(args.length<2) return 'cp: origem e destino necessários'; let src=getNode(resolvePath(args[0])); if(src===null||src===undefined) return 'cp: origem não existe'; let destPath=resolvePath(args[1]); let destParts=destPath.split('/').filter(Boolean); let node=fileSystem['/']; for(let i=0;i<destParts.length-1;i++){ if(!node[destParts[i]]) node[destParts[i]]={}; node=node[destParts[i]]; } node[destParts[destParts.length-1]]=JSON.parse(JSON.stringify(src)); saveFS(); return ''; },
    mv: (args) => { let res=commands.cp(args); if(res) return res; return commands.rm([args[0]]); },
    clear: () => { output.innerHTML=''; return ''; },
    docs: (args) => { if(!args[0]) return 'docs: nome necessário'; let doc=getNode(`/docs/${args[0]}.doc`); return doc || `docs: arquivo não encontrado`; },
    run: (args) => { if(!args[0]) return 'run: arquivo necessário'; let file=getNode(resolvePath(args[0])); if(!file) return 'run: arquivo não encontrado'; if(args[0].endsWith('.asm')) return runASM(file); if(args[0].endsWith('.tb')) return runBytecode(file); return 'run: formato não suportado'; },
    asmc: (args) => {
        if(args.length<2) return 'asmc: uso correto asmc arquivo.asm nomeoutput';
        let asmFile = getNode(resolvePath(args[0]));
        if(!asmFile) return 'asmc: arquivo asm não encontrado';
        let outputName = args[1]+'.tb';
        let path = resolvePath(outputName);
        let parts = path.split('/').filter(Boolean);
        let node=fileSystem['/'];
        for(let i=0;i<parts.length-1;i++){ if(!node[parts[i]]) node[parts[i]]={}; node=node[parts[i]]; }
        node[parts[parts.length-1]]=asmFile; // simplificado: bytecode é mesmo conteúdo do ASM
        saveFS();
        return `Arquivo ${outputName} compilado com sucesso!`;
    }
};

// ===== Interpretação ASM e Bytecode simples =====
function runASM(code){
    const lines=code.split('\n');
    let outputLines=[];
    for(let line of lines){
        line=line.trim();
        if(line.startsWith('PRINT')) { let msg=line.match(/PRINT\s+"(.*)"/); if(msg) outputLines.push(msg[1]); }
        else if(line.startsWith('ADD')) { let nums=line.split(' ').slice(1).map(Number); if(nums.length===2) outputLines.push((nums[0]+nums[1]).toString()); }
        else if(line.startsWith('SUB')) { let nums=line.split(' ').slice(1).map(Number); if(nums.length===2) outputLines.push((nums[0]-nums[1]).toString()); }
    }
    return outputLines.join('\n');
}
function runBytecode(code){ return runASM(code); }

// ===== Interação com o terminal =====
const input=document.getElementById('input');
const output=document.getElementById('output');
const promptSpan=document.getElementById('prompt');
function updatePrompt(){ promptSpan.textContent=getPrompt(); }
function printOutput(text){ const line=document.createElement('div'); line.textContent=text; output.appendChild(line); output.scrollTop=output.scrollHeight; }

// ===== Histórico e input =====
input.addEventListener('keydown',(e)=>{
    if(e.key==='Enter'){
        const commandLine=input.value.trim();
        printOutput(getPrompt()+' '+commandLine);
        if(commandLine){
            commandHistory.push(commandLine); historyIndex=commandHistory.length;
            const [cmd,...args]=commandLine.split(' ');
            if(cmd.startsWith('./') && cmd.endsWith('.tb')){
                let filename=cmd.slice(2);
                let file=getNode(resolvePath(filename));
                if(file) printOutput(runBytecode(file));
                else printOutput(`${cmd}: arquivo não encontrado`);
            } else if(commands[cmd]){ const res=commands[cmd](args); if(res) printOutput(res); }
            else printOutput(`${cmd}: comando não encontrado`);
        }
        input.value=''; updatePrompt();
    } else if(e.key==='ArrowUp'){
        if(historyIndex>0){ historyIndex--; input.value=commandHistory[historyIndex]; }
    } else if(e.key==='ArrowDown'){
        if(historyIndex<commandHistory.length-1){ historyIndex++; input.value=commandHistory[historyIndex]; }
        else{ historyIndex=commandHistory.length; input.value=''; }
    }
});

// ===== Inicialização =====
updatePrompt();