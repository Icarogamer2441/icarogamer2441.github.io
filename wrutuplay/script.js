const functions = {};
const variables = {};
const running_while = [false];

class Executor {
    constructor(code) {
        this.code = code;
    }

    execute1() {
        const lines = this.code.split("\n");
        let inFunc = false;
        let endnum = 0;
        let funcname = "";

        for (const line of lines) {
            const tokens = line.split(/\s+/) || line.split("\t");

            if (tokens.length > 0) {
                const token = tokens[0];

                if (!inFunc) {
                    if (token === "fnc") {
                        funcname = tokens[1];
                        if (tokens[2] === "[") {
                            endnum++;
                            inFunc = true;
                            functions[funcname] = [];
                        }
                    }
                } else {
                    if (token === "if" || token === "while") {
                        endnum++;
                        functions[funcname].push(tokens.join(" "));
                    } else if (token === "]") {
                        if (endnum > 0) {
                            endnum--;
                            functions[funcname].push(tokens.join(" "));
                        }
                        if (endnum === 0) {
                            inFunc = false;
                            functions[funcname].pop();
                        }
                    } else {
                        functions[funcname].push(tokens.join(" "));
                    }
                }
            }
        }

        new Executor(functions["main"].join("\n")).execute2();
    }

    execute2() {
        const lines = this.code.split("\n");
        let inIf = false;
        let varName1 = "";
        let operation = "";
        let varName2 = "";
        let ifCode = [];
        let endnum = 0;
        let inWhile = false;
        let whileCode = [];

        for (const line of lines) {
            const tokens = line.split(/\s+/) || line.split("\t");

            if (tokens.length > 0) {
                const token = tokens[0];

                if (!inIf && !inWhile) {
                    switch (token) {
                        case "showln":
                            this.handleShowln(tokens);
                            break;
                        case "int":
                            this.handleInt(tokens);
                            break;
                        case "string":
                            this.handleString(tokens);
                            break;
                        case "call":
                            this.handleCall(tokens);
                            break;
                        case "if":
                            [varName1, operation, varName2, inIf, endnum, ifCode] = this.handleIf(tokens, varName1, operation, varName2, inIf, endnum, ifCode);
                            break;
                        case "bool":
                            this.handleBool(tokens);
                            break;
                        case "while":
                            [inWhile, endnum, whileCode] = this.handleWhile(tokens, inWhile, endnum, whileCode);
                            break;
                        case "stop":
                            running_while[0] = false;
                            break;
                        case "mod":
                            this.handleMod(tokens);
                            break;
                        case "input":
                            this.handleInput(tokens);
                            break;
                        case "float":
                            this.handleFloat(tokens);
                            break;
                        case "rand":
                            this.handleRand(tokens);
                            break;
                        default:
                            break;
                    }
                } else if (inIf) {
                    [inIf, endnum, ifCode, varName1, varName2, operation] = this.processIfBlock(token, tokens, inIf, endnum, ifCode, varName1, varName2, operation);
                } else if (inWhile) {
                    [inWhile, endnum, whileCode] = this.processWhileBlock(token, tokens, inWhile, endnum, whileCode);
                }
            }
        }
    }

    handleShowln(tokens) {
        const output = document.getElementById('output');
        if (tokens[1] === "\"") {
            if (tokens[tokens.length - 1] === "\"") {
                const msg = tokens.slice(2, tokens.length - 1).join(" ");
                this.print(msg);
            } else {
                this.print("Error: use \" to close a string");
            }
        } else if (tokens[1] === "\\n") {
            this.print("\n");
        } else if (tokens[1] === "\\spc") {
            this.print(" ");
        } else {
            this.print(variables[tokens[1]]);
        }
    }

    handleInt(tokens) {
        const varName = tokens[1];
        if (tokens[2] === ":") {
            const value = parseInt(tokens[3]);
            variables[varName] = value;
        } else {
            this.print("Error: use : to attribute a value to a variable");
        }
    }

    handleString(tokens) {
        const varName = tokens[1];
        if (tokens[2] === ":") {
            const value = tokens.slice(3).join(" ");
            variables[varName] = value;
        } else {
            this.print("Error: use : to attribute a value to a variable");
        }
    }

    handleCall(tokens) {
        const funcName = tokens[1];
        new Executor(functions[funcName].join("\n")).execute2();
    }

    handleIf(tokens, varName1, operation, varName2, inIf, endnum, ifCode) {
        varName1 = tokens[1];
        operation = tokens[2];
        if (tokens.length === 5) {
            varName2 = tokens[3];
            if (tokens[4] === "[") {
                inIf = true;
                endnum++;
                ifCode = [];
            }
        } else {
            if (operation === "[") {
                inIf = true;
                endnum++;
                ifCode = [];
            }
        }
        return [varName1, operation, varName2, inIf, endnum, ifCode];
    }

    handleBool(tokens) {
        const varName = tokens[1];
        if (tokens[2] === ":") {
            variables[varName] = tokens[3] === "ok" ? 1 : 0;
        } else {
            this.print("Error: use : to attribute a value to a variable");
        }
    }

    handleWhile(tokens, inWhile, endnum, whileCode) {
        if (tokens[1] === "[") {
            inWhile = true;
            endnum++;
            running_while[0] = true;
            whileCode = [];
        } else {
            this.print("Error: use [ to open a while loop");
        }
        return [inWhile, endnum, whileCode];
    }

    handleMod(tokens) {
        const varName1 = tokens[1];
        const varName2 = tokens[3];
        if (tokens[2] === "<") {
            variables[varName1] += variables[varName2];
        } else {
            this.print("Error: use < to modify the second variable to the first variable");
        }
    }

    handleInput(tokens) {
        const type = tokens[1];
        const varName = tokens[2];
        if (type === "int") {
            variables[varName] = parseInt(prompt("Enter an integer:"));
        } else if (type === "string") {
            variables[varName] = prompt("Enter a string:");
        }
    }

    handleFloat(tokens) {
        const varName = tokens[1];
        if (tokens[2] === ":") {
            const value = parseFloat(tokens[3]);
            variables[varName] = value;
        } else {
            this.print("Error: use : to attribute a value to a variable");
        }
    }

    handleRand(tokens) {
        const varName1 = tokens[1];
        const varName2 = tokens[2];
        const outputVar = tokens[3];
        let min, max;

        if (isNaN(varName1)) {
            min = variables[varName1];
        } else {
            min = parseInt(varName1);
        }

        if (isNaN(varName2)) {
            max = variables[varName2];
        } else {
            max = parseInt(varName2);
        }

        variables[outputVar] = Math.floor(Math.random() * (max - min + 1)) + min;
    }

    processIfBlock(token, tokens, inIf, endnum, ifCode, varName1, varName2, operation) {
        if (token === "if" || token === "while") {
            endnum++;
            ifCode.push(tokens.join(" "));
        } else if (token === "]") {
            if (endnum > 0) {
                endnum--;
                ifCode.push(tokens.join(" "));
            }

            if (endnum === 0) {
                inIf = false;
                ifCode.pop();
                if (this.evaluateCondition(varName1, operation, varName2)) {
                    new Executor(ifCode.join("\n")).execute2();
                }
            }
        } else {
            ifCode.push(tokens.join(" "));
        }
        return [inIf, endnum, ifCode, varName1, varName2, operation];
    }

    processWhileBlock(token, tokens, inWhile, endnum, whileCode) {
        if (token === "if" || token === "while") {
            endnum++;
            whileCode.push(tokens.join(" "));
        } else if (token === "]") {
            if (endnum > 0) {
                endnum--;
                whileCode.push(tokens.join(" "));
            }

            if (endnum === 0) {
                inWhile = false;
                while (running_while[0]) {
                    new Executor(whileCode.join("\n")).execute2();
                }
            }
        } else {
            whileCode.push(tokens.join(" "));
        }
        return [inWhile, endnum, whileCode];
    }

    evaluateCondition(varName1, operation, varName2) {
        switch (operation) {
            case "=":
                return variables[varName1] === variables[varName2];
            case "!":
                return variables[varName1] !== variables[varName2];
            case ">>":
                return variables[varName1] >= variables[varName2];
            case "<<":
                return variables[varName1] <= variables[varName2];
            case ">":
                return variables[varName1] > variables[varName2];
            case "<":
                return variables[varName1] < variables[varName2];
            case "[":
                return variables[varName1];
            default:
                return false;
        }
    }

    print(message) {
        const output = document.getElementById('output');
        output.textContent += message;
    }
}

document.getElementById('run-button').addEventListener('click', () => {
    const code = document.getElementById('code-input').value;
    new Executor(code).execute1();
});
