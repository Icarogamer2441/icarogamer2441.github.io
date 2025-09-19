// ===== Sistema de arquivos básico =====
let fileSystem = JSON.parse(localStorage.getItem('terminiFS')) || null;
let currentPath = '/';
let commandHistory = [];
let historyIndex = -1;
let terminalType = localStorage.getItem('terminiType') || 'pc';

function initFS(){
    if(!fileSystem){
        fileSystem = {'/': {docs: {
            'asm.doc':'Assembly Termini:\nComandos: PRINT "texto", ADD <n1> <n2>, SUB <n1> <n2>',
            'bytecode.doc':'Bytecode Termini:\nComandos: PRINT, ADD, SUB'
        }}};
        saveFS();
    } else if(!fileSystem['/'].docs){
        fileSystem['/'].docs = {
            'asm.doc':'Assembly Termini:\nComandos: PRINT "texto", ADD <n1> <n2>, SUB <n1> <n2>',
            'bytecode.doc':'Bytecode Termini:\nComandos: PRINT, ADD, SUB'
        };
        saveFS();
    }
}
initFS();

// ===== Funções utilitárias =====
function saveFS() { localStorage.setItem('terminiFS', JSON.stringify(fileSystem)); }
function saveType() { localStorage.setItem('terminiType', terminalType); }

function normalizePath(path){
    if(path.startsWith('/')){ return path; }
    let fullPath = currentPath === '/' ? '/' + path : currentPath + '/' + path;
    let parts = fullPath.split('/').filter(Boolean);
    let stack=[];
    for(let part of parts){
        if(part==='..'){ if(stack.length>0) stack.pop(); }
        else if(part!=='.'){ stack.push(part); }
    }
    return '/' + stack.join('/');
}

function getNode(path){
    path = normalizePath(path);
    let node = fileSystem['/'];
    let parts = path.split('/').filter(Boolean);
    for(let part of parts){
        if(!node[part]) return null;
        node = node[part];
    }
    return node;
}

function setNode(path,value){
    path = normalizePath(path);
    let parts = path.split('/').filter(Boolean);
    let node = fileSystem['/'];
    for(let i=0;i<parts.length-1;i++){
        if(!node[parts[i]]) node[parts[i]]={};
        node = node[parts[i]];
    }
    node[parts[parts.length-1]] = value;
    saveFS();
}

function deleteNode(path){
    path = normalizePath(path);
    let parts = path.split('/').filter(Boolean);
    let node = fileSystem['/'];
    for(let i=0;i<parts.length-1;i++){
        if(!node[parts[i]]) return false;
        node = node[parts[i]];
    }
    delete node[parts[parts.length-1]];
    saveFS();
    return true;
}

function listDir(path){
    let node = getNode(path);
    if(node && typeof node==='object') return Object.keys(node);
    return null;
}

// ===== Comandos =====
const commands = {
    help:()=>`Comandos: help, ls, cd, mkdir, touch, cat, echo, deleteall, pwd, type mobile/pc, rm, cp, mv, clear, docs, run, asmc, edit`,
    ls:(args)=>{ let dir=listDir(args[0]?normalizePath(args[0]):currentPath); return dir?dir.join(' '):'ls: diretório não encontrado'; },
    cd:(args)=>{ let path=args[0]?normalizePath(args[0]):'/'; if(getNode(path)&&typeof getNode(path)==='object'){ currentPath=path; return ''; } return 'cd: diretório não encontrado'; },
    mkdir:(args)=>{ if(!args[0]) return 'mkdir: nome necessário'; setNode(args[0],{}); return ''; },
    touch:(args)=>{ if(!args[0]) return 'touch: nome necessário'; setNode(args[0],''); return ''; },
    cat:(args)=>{ if(!args[0]) return 'cat: nome necessário'; let n=getNode(args[0]); return n===null||typeof n==='object'? 'cat: arquivo não encontrado ou diretório':n; },
    echo:(args)=>{ if(args.length<2) return 'echo: uso echo "conteudo" arquivo'; let content=args.slice(0,args.length-1).join(' ').replace(/^"|"$/g,''); setNode(args[args.length-1],content); return ''; },
    pwd:()=>currentPath,
    deleteall:()=>{ fileSystem={'/':{docs:fileSystem['/'].docs}}; currentPath='/'; saveFS(); return 'Sistema de arquivos resetado!'; },
    type:(args)=>{ if(!args[0]) return 'type: mobile/pc necessário'; if(args[0]==='mobile'||args[0]==='pc'){ terminalType=args[0]; saveType(); return `Terminal configurado para ${terminalType}`; } return 'type: opção inválida'; },
    rm:(args)=>{ if(!args[0]) return 'rm: arquivo ou diretório necessário'; deleteNode(args[0]); return ''; },
    cp:(args)=>{ if(args.length<2) return 'cp: origem e destino'; let src=getNode(args[0]); if(src===null) return 'cp: origem não existe'; setNode(args[1],JSON.parse(JSON.stringify(src))); return ''; },
    mv:(args)=>{ let res=commands.cp(args); if(res) return res; return commands.rm([args[0]]); },
    clear:()=>{ output.innerHTML=''; return ''; },
    docs:(args)=>{ if(!args[0]) return 'docs: nome necessário'; let doc=getNode('/docs/'+args[0]+'.doc'); return doc?doc:'docs: arquivo não encontrado'; },
    run:(args)=>{ if(!args[0]) return 'run: arquivo necessário'; let file=getNode(args[0]); if(!file) return 'run: arquivo não encontrado'; if(args[0].endsWith('.asm')) return runASM(file); if(args[0].endsWith('.tb')) return runBytecode(file); return 'run: formato não suportado'; },
    asmc:(args)=>{ if(args.length<2) return 'asmc: uso asmc arquivo.asm nomeoutput'; let asm=getNode(args[0]); if(!asm) return 'asmc: arquivo asm não encontrado'; setNode(args[1]+'.tb',asm); return `Arquivo ${args[1]}.tb compilado com sucesso!`; },
    edit:(args)=>{
        if(!args[0]) return 'edit: arquivo necessário';
        let content=getNode(args[0]); if(content===null) content='';
        const modal=document.getElementById('editor-modal');
        const textarea=document.getElementById('editor-text');
        modal.style.display='flex';
        textarea.value=content;
        textarea.focus();
        return args[0];
    }
};

// ===== Interpretação ASM e Bytecode =====
function runASM(code){ return code.split('\n').map(l=>{ l=l.trim(); if(l.startsWith('PRINT')) return (l.match(/PRINT\s+"(.*)"/)||['',''])[1]; if(l.startsWith('ADD')){ let n=l.split(' ').slice(1).map(Number); return n[0]+n[1]; } if(l.startsWith('SUB')){ let n=l.split(' ').slice(1).map(Number); return n[0]-n[1]; } return ''; }).join('\n'); }
function runBytecode(code){ return runASM(code); }

// ===== Terminal UI =====
const input=document.getElementById('input');
const output=document.getElementById('output');
const promptSpan=document.getElementById('prompt');
function updatePrompt(){ promptSpan.textContent=getPrompt(); }
function printOutput(text){ const line=document.createElement('div'); line.textContent=text; output.appendChild(line); output.scrollTop=output.scrollHeight; }

// ===== Editor Modal =====
const modal=document.getElementById('editor-modal');
const textarea=document.getElementById('editor-text');
document.getElementById('save-btn').onclick=()=>{
    const filename = commandHistory[commandHistory.length-1].split(' ')[1];
    setNode(filename,textarea.value);
    modal.style.display='none';
    printOutput(`Arquivo ${filename} salvo!`);
};
document.getElementById('cancel-btn').onclick=()=>{ modal.style.display='none'; printOutput('Edição cancelada'); };

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
                let file=getNode(filename);
                if(file) printOutput(runBytecode(file));
                else printOutput(`${cmd}: arquivo não encontrado`);
            } else if(commands[cmd]){ const res=commands[cmd](args); if(res && cmd!=='edit') printOutput(res); }
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