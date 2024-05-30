document.getElementById('execute').addEventListener('click', () => {
    const code = document.getElementById('editor').value;
    const outputElement = document.getElementById('output');
    outputElement.innerHTML = ''; // Clear previous output

    try {
        runWrutulang(code, outputElement);
    } catch (error) {
        outputElement.textContent = error.message;
    }
});

function runWrutulang(code, outputElement) {
    const functions = {};
    const variables = {};
    let running_while = false;

    class Executor {
        constructor(code) {
            this.code = code;
        }

        execute1() {
            const lines = this.code.split('\n');
            let in_func = false;
            let endnum = 0;
            let funcname = '';

            for (const line of lines) {
                const tokens = line.trim().split(/\s+/);
                if (tokens.length === 0) continue;

                const token = tokens[0];
                if (!in_func) {
                    if (token === 'fnc') {
                        funcname = tokens[1];
                        if (tokens[2] === '[') {
                            endnum += 1;
                            in_func = true;
                            functions[funcname] = [];
                        }
                    }
                } else {
                    if (token === 'if' || token === 'while') {
                        endnum += 1;
                        functions[funcname].push(line);
                    } else if (token === ']') {
                        endnum -= 1;
                        if (endnum <= 0) {
                            in_func = false;
                            endnum = 0;
                            functions[funcname].push(line);
                            functions[funcname].pop();
                        } else {
                            functions[funcname].push(line);
                        }
                    } else {
                        functions[funcname].push(line);
                    }
                }
            }
            new Executor(functions['main'].join('\n')).execute2();
        }

        execute2() {
            const lines = this.code.split('\n');
            let in_if = false;
            let varname1 = '';
            let operation = '';
            let varname2 = '';
            let ifcode = [];
            let endnum = 0;
            let in_while = false;
            let while_code = [];

            for (const line of lines) {
                const tokens = line.trim().split(/\s+/);
                if (tokens.length === 0) continue;

                const token = tokens[0];
                if (!in_if && !in_while) {
                    if (token === 'showln') {
                        if (tokens[1] === '"') {
                            if (tokens[tokens.length - 1] === '"') {
                                const msg = tokens.slice(2, tokens.length - 1).join(' ');
                                outputElement.textContent += msg;
                            } else {
                                throw new Error('Error: use " to close a string');
                            }
                        } else if (tokens[1] === '\\n') {
                            outputElement.textContent += '\n';
                        } else if (tokens[1] === '\\spc') {
                            outputElement.textContent += ' ';
                        } else {
                            outputElement.textContent += variables[tokens[1]] || '';
                        }
                    } else if (token === 'int') {
                        const varname = tokens[1];
                        if (tokens[2] === ':') {
                            const value = parseInt(tokens[3], 10);
                            variables[varname] = value;
                        } else {
                            throw new Error('Error: use : to assign a value to a variable');
                        }
                    } else if (token === 'string') {
                        const varname = tokens[1];
                        if (tokens[2] === ':') {
                            const value = tokens.slice(3).join(' ');
                            variables[varname] = value;
                        } else {
                            throw new Error('Error: use : to assign a value to a variable');
                        }
                    } else if (token === 'call') {
                        const funcname = tokens[1];
                        new Executor(functions[funcname].join('\n')).execute2();
                    } else if (token === 'if') {
                        varname1 = tokens[1];
                        operation = tokens[2];
                        if (tokens.length === 5) {
                            varname2 = tokens[3];
                            if (tokens[4] === '[') {
                                in_if = true;
                                endnum += 1;
                                ifcode = [];
                            }
                        } else if (operation === '[') {
                            in_if = true;
                            endnum += 1;
                            ifcode = [];
                        }
                    } else if (token === 'bool') {
                        const varname = tokens[1];
                        if (tokens[2] === ':') {
                            variables[varname] = tokens[3] === 'ok' ? 1 : 0;
                        } else {
                            throw new Error('Error: use : to assign a value to a variable');
                        }
                    } else if (token === 'while') {
                        if (tokens[1] === '[') {
                            in_while = true;
                            while_code = [];
                            endnum += 1;
                            running_while = true;
                        } else {
                            throw new Error('Error: use [ to open a while loop');
                        }
                    } else if (token === 'stop') {
                        running_while = false;
                    } else if (token === 'mod') {
                        const varname1 = tokens[1];
                        if (tokens[2] === '<') {
                            const varname2 = tokens[3];
                            variables[varname1] += variables[varname2];
                        } else {
                            throw new Error('Error: use < to modify the second variable to the first variable');
                        }
                    } else if (token === 'input') {
                        const inptype = tokens[1];
                        const varname = tokens[2];
                        if (inptype === 'int') {
                            variables[varname] = parseInt(prompt('Enter an integer:'), 10);
                        } else if (inptype === 'string') {
                            variables[varname] = prompt('Enter a string:');
                        }
                    } else if (token === 'float') {
                        const varname = tokens[1];
                        if (tokens[2] === ':') {
                            const value = parseFloat(tokens[3]);
                            variables[varname] = value;
                        } else {
                            throw new Error('Error: use : to assign a value to a variable');
                        }
                    } else if (token === 'rand') {
                        const varname1 = tokens[1];
                        const varname2 = tokens[2];
                        const outputvar = tokens[3];
                        const min = variables[varname1] || parseInt(varname1, 10);
                        const max = variables[varname2] || parseInt(varname2, 10);
                        variables[outputvar] = Math.floor(Math.random() * (max - min + 1)) + min;
                    }
                } else if (in_if) {
                    if (token === 'if' || token === 'while') {
                        endnum += 1;
                        ifcode.push(line);
                    } else if (token === ']') {
                        endnum -= 1;
                        ifcode.push(line);
                        if (endnum <= 0) {
                            in_if = false;
                            endnum = 0;
                            ifcode.pop();
                            if (evaluateCondition(varname1, operation, varname2)) {
                                new Executor(ifcode.join('\n')).execute2();
                            }
                        }
                    } else {
                        ifcode.push(line);
                    }
                } else if (in_while) {
                    if (token === 'if' || token === 'while') {
                        endnum += 1;
                        while_code.push(line);
                    } else if (token === ']') {
                        endnum -= 1;
                        while_code.push(line);
                        if (endnum <= 0) {
                            in_while = false;
                            endnum = 0;
                            while (running_while) {
                                new Executor(while_code.join('\n')).execute2();
                            }
                        }
                    } else {
                        while_code.push(line);
                    }
                }
            }
        }
    }

    function evaluateCondition(var1, op, var2) {
        switch (op) {
            case '=': return variables[var1] === variables[var2];
            case '!': return variables[var1] !== variables[var2];
            case '>>': return variables[var1] >= variables[var2];
            case '<<': return variables[var1] <= variables[var2];
            case '>': return variables[var1] > variables[var2];
            case '<': return variables[var1] < variables[var2];
            case '[': return !!variables[var1];
            default: throw new Error(`Invalid operation: ${op}`);
        }
    }

    new Executor(code).execute1();
}
