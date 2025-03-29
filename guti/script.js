document.addEventListener('DOMContentLoaded', () => {
    const codeInput = document.getElementById('codeInput');
    const runButton = document.getElementById('runButton');
    const outputArea = document.getElementById('outputArea');
    const inputArea = document.getElementById('inputArea');

    runButton.addEventListener('click', executeCode);

    function executeCode() {
        const codeLines = codeInput.value.split('\n');
        const initialInput = inputArea.value;
        let inputPointer = 0;
        outputArea.textContent = ''; // Clear previous output
        let stack = [];
        let output = '';
        let ip = 0; // Instruction pointer (line number)
        let charIp = 0; // Character pointer within the line
        let skipNext = false; // For '!' instruction after a false '?'
        const maxSteps = 10000; // Prevent infinite loops
        let steps = 0;

        // Pre-find label locations and loop pairs for efficiency
        const labels = {}; // { 'char': { line: ip, char: charIp } }
        const loopPairs = {}; // { '<_location': '>_location', '>_location': '<_location' }
        const loopStack = [];

        for (let i = 0; i < codeLines.length; i++) {
            for (let j = 0; j < codeLines[i].length; j++) {
                const char = codeLines[i][j];
                if (char === '!' && j + 1 < codeLines[i].length && codeLines[i][j+1] !== '<' && codeLines[i][j+1] !== '>') {
                    // Basic label definition !<char>
                    labels[codeLines[i][j+1]] = { line: i, char: j + 2 }; // Point after label char
                } else if (char === '<') {
                    loopStack.push({ line: i, char: j });
                } else if (char === '>') {
                    if (loopStack.length > 0) {
                        const start = loopStack.pop();
                        const startLoc = `${start.line}_${start.char}`;
                        const endLoc = `${i}_${j}`;
                        loopPairs[startLoc] = endLoc;
                        loopPairs[endLoc] = startLoc;
                    } else {
                        output = `Error: Unmatched '>' at line ${i + 1}, char ${j + 1}`;
                        outputArea.textContent = output;
                        return;
                    }
                }
            }
        }
         if (loopStack.length > 0) {
            const openLoop = loopStack[0];
            output = `Error: Unmatched '<' at line ${openLoop.line + 1}, char ${openLoop.char + 1}`;
            outputArea.textContent = output;
            return;
        }


        while (ip < codeLines.length && steps < maxSteps) {
            steps++;
            const line = codeLines[ip];
            if (charIp >= line.length) {
                ip++;
                charIp = 0;
                continue; // Move to next line
            }

            const instruction = line[charIp];

            if (skipNext) {
                skipNext = false;
                charIp++;
                continue;
            }

            // --- Instruction Handling ---
            switch (instruction) {
                case '"': // String literal
                    charIp++;
                    let str = "";
                    while (charIp < line.length && line[charIp] !== '"') {
                        str += line[charIp];
                        charIp++;
                    }
                    if (charIp < line.length && line[charIp] === '"') {
                         // Push characters individually? Or the whole string?
                         // Based on "Hello, world!"@. example, seems like the whole string is one item.
                         stack.push(str);
                    } else {
                         output = `Error: Unterminated string literal on line ${ip + 1}`;
                         outputArea.textContent = output;
                         return; // Stop execution
                    }
                    charIp++; // Move past the closing "
                    break;

                case '@': // Pop, reverse item (if string), push back
                    if (stack.length > 0) {
                        let item = stack.pop();
                        if (typeof item === 'string') {
                            item = item.split('').reverse().join('');
                        }
                        // Non-strings are pushed back unchanged
                        stack.push(item);
                    } else {
                        output = `Error: Stack underflow on '@' at line ${ip + 1}, char ${charIp + 1}`;
                        outputArea.textContent = output;
                        return; // Stop execution on error
                    }
                    charIp++;
                    break;

                case '.': // Pop and print
                    if (stack.length > 0) {
                        let val = stack.pop();
                        // The example "Hello, world!"@. suggests '.' reverses the popped string.
                        // Let's implement that interpretation.
                        if (typeof val === 'string') {
                            output += val.split('').reverse().join('');
                        } else {
                            output += val; // Print numbers/other types as is
                        }
                    } else {
                        output = `Error: Stack underflow on '.' at line ${ip + 1}, char ${charIp + 1}`;
                        outputArea.textContent = output;
                        return;
                    }
                    charIp++;
                    break;

                case ';': // Input character
                    if (inputPointer < initialInput.length) {
                        stack.push(initialInput[inputPointer]);
                        inputPointer++;
                    } else {
                        // No more input, push a default value? Or error? Let's push 0 for now.
                        stack.push('0'); // Or maybe null/undefined? Let's use '0' based on example logic.
                    }
                    charIp++;
                    break;

                case '$': // Duplicate top
                    if (stack.length > 0) {
                        stack.push(stack[stack.length - 1]);
                    } else {
                        output = `Error: Stack underflow on '$' at line ${ip + 1}, char ${charIp + 1}`;
                        outputArea.textContent = output;
                        return;
                    }
                    charIp++;
                    break;

                case '?': // Conditional jump based on character C after ?
                    if (charIp + 1 < line.length) {
                        const conditionChar = line[charIp + 1];
                        const originalIp = ip;
                        const originalCharIp = charIp;

                        if (stack.length > 0) {
                            const top = stack.pop();
                            const match = (String(top) === conditionChar);

                            // Find the next '!' after '?C'
                            let foundBang = false;
                            let bangIp = ip;
                            let bangCharIp = charIp + 2; // Start searching after '?C'

                            while (bangIp < codeLines.length) {
                                const searchLine = codeLines[bangIp];
                                while (bangCharIp < searchLine.length) {
                                    if (searchLine[bangCharIp] === '!') {
                                        foundBang = true;
                                        break;
                                    }
                                    bangCharIp++;
                                }
                                if (foundBang) break;
                                bangIp++;
                                bangCharIp = 0; // Start at beginning of next line
                            }

                            if (!foundBang) {
                                output = `Error: No matching '!' found for '?' at line ${originalIp + 1}, char ${originalCharIp + 1}`;
                                outputArea.textContent = output;
                                return;
                            }

                            if (match) {
                                // Condition true: Jump execution to *after* the '!'
                                ip = bangIp;
                                charIp = bangCharIp + 1;
                                // Ensure charIp doesn't go out of bounds if ! is last char
                                if (charIp >= codeLines[ip].length) {
                                     ip++;
                                     charIp = 0;
                                }
                            } else {
                                // Condition false: Skip the entire line containing the '!'
                                ip = bangIp + 1;
                                charIp = 0;
                            }
                            continue; // Restart loop with new ip/charIp

                        } else {
                            output = `Error: Stack underflow on '?' at line ${ip + 1}, char ${charIp + 1}`;
                            outputArea.textContent = output;
                            return;
                        }
                    } else {
                        output = `Error: Incomplete '?' instruction at line ${ip + 1}`;
                        outputArea.textContent = output;
                        return;
                    }
                    // Break is removed because we use 'continue' after setting ip/charIp

                case '!': // Now primarily acts as a jump target marker for '?'
                    // Execution should normally pass over it unless jumped to by '?'
                    charIp++;
                    break;

                case '<': // Loop start
                    // Handled by pre-scan, just move past it during execution
                    charIp++;
                    break;

                case '>': // Loop end/conditional jump back
                    const endLoc = `${ip}_${charIp}`;
                    if (loopPairs[endLoc]) {
                        if (stack.length > 0) {
                            const top = stack.pop();
                            // Convert to number for check, default to 0 if not a number
                            const numTop = Number(top);
                            if (!isNaN(numTop) && numTop !== 0) {
                                // Condition true (non-zero), jump back to matching '<'
                                const startLoc = loopPairs[endLoc];
                                const [startLine, startChar] = startLoc.split('_').map(Number);
                                ip = startLine;
                                charIp = startChar + 1; // Move past the '<'
                            } else {
                                // Condition false (0 or NaN), continue after '>'
                                charIp++;
                            }
                        } else {
                             // Stack empty, treat as false? Or error? Let's treat as false (exit loop).
                             // The example implies loop continues if stack empty after pop? No, example says "1 foi imprimido e não tem mais elemento, ele volta automaticamente" - this implies empty stack loops. Let's adjust.
                             // Let's re-read: "se o ultimo elemento da stack for 0, ele para, se não, pula para <, e como o 1 foi imprimido e não tem mais elemento, ele volta automaticamente"
                             // This means: Pop. If 0, continue after >. If non-zero, jump to <. If stack was empty *before* pop, jump to <.
                             // Let's refine the logic:
                             let shouldJump = false;
                             if (stack.length > 0) {
                                 const top = stack.pop();
                                 const numTop = Number(top);
                                 if (isNaN(numTop) || numTop !== 0) { // Non-zero or NaN jumps back
                                     shouldJump = true;
                                 }
                             } else {
                                 shouldJump = true; // Empty stack jumps back
                             }

                             if (shouldJump) {
                                const startLoc = loopPairs[endLoc];
                                const [startLine, startChar] = startLoc.split('_').map(Number);
                                ip = startLine;
                                charIp = startChar + 1; // Move past the '<'
                             } else {
                                 // Condition false (was 0), continue after '>'
                                 charIp++;
                             }
                        }
                    } else {
                        // Should have been caught by pre-scan, but just in case
                        output = `Error: Unmatched '>' at line ${ip + 1}, char ${charIp + 1}`;
                        outputArea.textContent = output;
                        return;
                    }
                    // Don't increment charIp if jump occurred
                    break;

                case '*': // Jump to line number
                    if (charIp + 1 < line.length) {
                        const numStr = line.substring(charIp + 1).match(/^\d+/);
                        if (numStr) {
                            const targetLine = parseInt(numStr[0], 10);
                            if (targetLine >= 0 && targetLine < codeLines.length) {
                                ip = targetLine;
                                charIp = 0; // Start at beginning of target line
                            } else {
                                output = `Error: Invalid line number for '*' jump at line ${ip + 1}`;
                                outputArea.textContent = output;
                                return;
                            }
                            // Don't increment charIp, new line starts
                        } else {
                            output = `Error: Invalid target for '*' jump at line ${ip + 1}`;
                            outputArea.textContent = output;
                            return;
                        }
                    } else {
                        output = `Error: Incomplete '*' instruction at line ${ip + 1}`;
                        outputArea.textContent = output;
                        return;
                    }
                    break;

                case '&': // Skip lines
                     if (charIp + 1 < line.length) {
                        const numStr = line.substring(charIp + 1).match(/^\d+/);
                        if (numStr) {
                            const linesToSkip = parseInt(numStr[0], 10);
                            ip += linesToSkip; // Skip the specified number of lines
                            charIp = line.length; // Ensure we move to the next line processing cycle
                        } else {
                            output = `Error: Invalid number for '&' skip at line ${ip + 1}`;
                            outputArea.textContent = output;
                            return;
                        }
                    } else {
                        output = `Error: Incomplete '&' instruction at line ${ip + 1}`;
                        outputArea.textContent = output;
                        return;
                    }
                    break;

                // --- Arithmetic ---
                case '+':
                case '-':
                case 'x': // Using 'x' for multiplication
                case '/':
                    if (stack.length >= 2) {
                        const b = Number(stack.pop());
                        const a = Number(stack.pop());
                        if (isNaN(a) || isNaN(b)) {
                             output = `Error: Non-numeric value for arithmetic at line ${ip + 1}, char ${charIp + 1}`;
                             outputArea.textContent = output;
                             return;
                        }
                        let result;
                        switch (instruction) {
                            case '+': result = a + b; break;
                            case '-': result = a - b; break;
                            case 'x': result = a * b; break;
                            case '/':
                                if (b === 0) {
                                    output = `Error: Division by zero at line ${ip + 1}, char ${charIp + 1}`;
                                    outputArea.textContent = output;
                                    return;
                                }
                                result = a / b;
                                break;
                        }
                        stack.push(result);
                    } else {
                        output = `Error: Stack underflow for arithmetic at line ${ip + 1}, char ${charIp + 1}`;
                        outputArea.textContent = output;
                        return;
                    }
                    charIp++;
                    break;

                // Ignore whitespace and unknown characters
                case ' ':
                case '\t':
                    charIp++;
                    break;

                default: // Unknown instruction
                    // Optionally report an error or just ignore
                    // output += `Warning: Unknown instruction '${instruction}' at line ${ip + 1}, char ${charIp + 1}\n`;
                    charIp++;
                    break;
            }
        }

        if (steps >= maxSteps) {
            output += "\nError: Maximum execution steps exceeded (possible infinite loop)";
        }

        outputArea.textContent = output;
    }
});
