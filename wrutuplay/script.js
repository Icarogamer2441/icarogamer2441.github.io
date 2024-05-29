const functions = {};
const variables = {};
let runningWhile = false;

class Executor {
    constructor(code) {
        this.code = code;
    }

    execute1() {
        const lines = this.code.split('\n');
        let inFunc = false;
        let endNum = 0;
        let funcName = '';

        lines.forEach(line => {
            const tokens = line.trim().split(/\s+/);

            if (tokens.length > 0) {
                const token = tokens[0];

                if (!inFunc) {
                    if (token === 'fnc') {
                        funcName = tokens[1];
                        if (tokens[2] === '[') {
                            endNum += 1;
                            inFunc = true;
                            functions[funcName] = [];
                        }
                    }
                } else {
                    if (token === 'if' || token === 'while') {
                        endNum += 1;
                        functions[funcName].push(tokens.join(' '));
                    } else if (token === ']') {
                        if (endNum > 0) {
                            endNum -= 1;
                            functions[funcName].push(tokens.join(' '));
                        }
                        if (endNum <= 0) {
                            inFunc = false;
                            endNum = 0;
                            functions[funcName].pop();
                        }
                    } else {
                        functions[funcName].push(tokens.join(' '));
                    }
                }
            }
        });

        if (functions['main']) {
            new Executor(functions['main'].join('\n')).execute2();
        }
    }

    execute2() {
        const lines = this.code.split('\n');
        let inIf = false;
        let inWhile = false;
        let endNum = 0;
        let ifCode = [];
        let whileCode = [];
        let varName1 = '';
        let operation = '';
        let varName2 = '';

        lines.forEach(line => {
            const tokens = line.trim().split(/\s+/);

            if (tokens.length > 0) {
                const token = tokens[0];

                if (!inIf && !inWhile) {
                    if (token === 'showln') {
                        if (tokens[1] === '"') {
                            if (tokens[tokens.length - 1] === '"') {
                                const msg = tokens.slice(2, tokens.length - 1).join(' ');
                                this.print(msg);
                            } else {
                                this.print('Error: use " to close a string');
                            }
                        } else if (tokens[1] === '\\n') {
                            this.print('\n');
                        } else if (tokens[1] === '\\spc') {
                            this.print(' ');
                        } else {
                            this.print(variables[tokens[1]]);
                        }
                    } else if (token === 'int') {
                        const varName = tokens[1];
                        if (tokens[2] === ':') {
                            variables[varName] = parseInt(tokens[3], 10);
                        } else {
                            this.print('Error: use : to assign a value to a variable');
                        }
                    } else if (token === 'string') {
                        const varName = tokens[1];
                        if (tokens[2] === ':') {
                            variables[varName] = tokens.slice(3).join(' ');
                        } else {
                            this.print('Error: use : to assign a value to a variable');
                        }
                    } else if (token === 'call') {
                        const funcName = tokens[1];
                        if (functions[funcName]) {
                            new Executor(functions[funcName].join('\n')).execute2();
                        }
                    } else if (token === 'if') {
                        varName1 = tokens[1];
                        operation = tokens[2];
                        if (tokens.length === 5) {
                            varName2 = tokens[3];
                            if (tokens[4] === '[') {
                                inIf = true;
                                endNum += 1;
                                ifCode = [];
                            }
                        } else {
                            if (operation === '[') {
                                inIf = true;
                                endNum += 1;
                                ifCode = [];
                            }
                        }
                    } else if (token === 'bool') {
                        const varName = tokens[1];
                        if (tokens[2] === ':') {
                            variables[varName] = tokens[3] === 'ok' ? 1 : 0;
                        } else {
                            this.print("Error: use : to assign a value to a variable");
                        }
                    } else if (token === 'while') {
                        if (tokens[1] === '[') {
                            inWhile = true;
                            whileCode = [];
                            endNum += 1;
                            runningWhile = true;
                        } else {
                            this.print("Error: use [ to open a while loop");
                        }
                    } else if (token === 'stop') {
                        runningWhile = false;
                    } else if (token === 'mod') {
                        const varName1 = tokens[1];
                        if (tokens[2] === '<') {
                            const varName2 = tokens[3];
                            variables[varName1] += variables[varName2];
                        } else {
                            this.print("Error: use < to modify the second var to the first var");
                        }
                    } else if (token === 'input') {
                        const inputType = tokens[1];
                        if (inputType === 'int') {
                            const varName = tokens[2];
                            variables[varName] = parseInt(prompt("Enter an integer:"), 10);
                        } else if (inputType === 'string') {
                            const varName = tokens[2];
                            variables[varName] = prompt("Enter a string:");
                        }
                    }
                } else if (inIf) {
                    if (token === 'if' || token === 'while') {
                        endNum += 1;
                        ifCode.push(tokens.join(' '));
                    } else if (token === ']') {
                        if (endNum > 0) {
                            endNum -= 1;
                            ifCode.push(tokens.join(' '));
                        }
                        if (endNum <= 0) {
                            inIf = false;
                            endNum = 0;
                            ifCode.pop();
                            this.evaluateIf(varName1, operation, varName2, ifCode);
                        }
                    } else {
                        ifCode.push(tokens.join(' '));
                    }
                } else if (inWhile) {
                    if (token === 'if' || token === 'while') {
                        endNum += 1;
                        whileCode.push(tokens.join(' '));
                    } else if (token === ']') {
                        if (endNum > 0) {
                            endNum -= 1;
                            whileCode.push(tokens.join(' '));
                        }
                        if (endNum <= 0) {
                            inWhile = false;
                            endNum = 0;
                            while (runningWhile) {
                                new Executor(whileCode.join('\n')).execute2();
                            }
                        }
                    } else {
                        whileCode.push(tokens.join(' '));
                    }
                }
            }
        });
    }

    evaluateIf(varName1, operation, varName2, ifCode) {
        if (operation === '=') {
            if (variables[varName1] === variables[varName2]) {
                new Executor(ifCode.join('\n')).execute2();
            }
        } else if (operation === '!') {
            if (variables[varName1] !== variables[varName2]) {
                new Executor(ifCode.join('\n')).execute2();
            }
        } else if (operation === '>>') {
            if (variables[varName1] >= variables[varName2]) {
                new Executor(ifCode.join('\n')).execute2();
            }
        } else if (operation === '<<') {
            if (variables[varName1] <= variables[varName2]) {
                new Executor(ifCode.join('\n')).execute2();
            }
        } else if (operation === '>') {
            if (variables[varName1] > variables[varName2]) {
                new Executor(ifCode.join('\n')).execute2();
            }
        } else if (operation === '<') {
            if (variables[varName1] < variables[varName2]) {
                new Executor(ifCode.join('\n')).execute2();
            }
        } else if (operation === '[') {
            if (variables[varName1]) {
                new Executor(ifCode.join('\n')).execute2();
            }
        }
    }

    print(message) {
        const output = document.getElementById('output');
        output.textContent += message + '\n';
    }
}

document.getElementById('run-button').addEventListener('click', () => {
    const code = document.getElementById('code-input').value;
    document.getElementById('output').textContent = '';
    new Executor(code).execute1();
});
