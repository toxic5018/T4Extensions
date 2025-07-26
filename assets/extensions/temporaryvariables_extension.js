// Temporary Variables Extension
// Version 1.0
// Made by Toxic5018
// Follow my website: https://toxic5018.github.io/toxic5018.me/

(async function (Scratch) {
    if (!Scratch.extensions.unsandboxed) {
        alert("This extension needs to be unsandboxed for full Temporary Variables functionality!");
        return;
    }

    // --- Internal Storage for Temporary Variables ---
    const _tempVariables = new Map(); // Stores variable names (string) to their values (any type)

    // --- Utility Functions ---
    // Helper to parse potential string inputs to numbers (e.g., from Scratch blocks)
    function parseNumber(value) {
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    }

    // Helper to parse JSON strings safely
    function parseJson(str) {
        try {
            return JSON.parse(str);
        } catch (e) {
            console.error("Failed to parse JSON string:", str, e);
            return null; // Return null or suitable default on error
        }
    }

    // Helper to convert value to array, if it's not already
    function ensureArray(value) {
        if (Array.isArray(value)) {
            return value;
        }
        if (typeof value === 'string') {
            const parsed = parseJson(value);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
        return []; // Default to empty array if not array or valid JSON array string
    }

    // --- Temporary Variables Blocks Functions ---

    function setTemporaryVariable(args) {
        const name = String(args.NAME);
        _tempVariables.set(name, args.VALUE);
    }

    function getTemporaryVariable(args) {
        const name = String(args.NAME);
        // Return the value, or an empty string if not found to avoid "undefined" in Scratch
        return _tempVariables.has(name) ? _tempVariables.get(name) : "";
    }

    function changeTemporaryVariableBy(args) {
        const name = String(args.NAME);
        const amount = parseNumber(args.AMOUNT);
        if (_tempVariables.has(name)) {
            let currentValue = parseNumber(_tempVariables.get(name));
            _tempVariables.set(name, currentValue + amount);
        } else {
            // If variable doesn't exist, initialize it with the amount
            _tempVariables.set(name, amount);
        }
    }

    function removeTemporaryVariable(args) {
        const name = String(args.NAME);
        _tempVariables.delete(name);
    }

    function temporaryVariableExists(args) {
        const name = String(args.NAME);
        return _tempVariables.has(name);
    }

    function clearAllTemporaryVariables() {
        _tempVariables.clear();
    }

    // --- Conditional Blocks ---
    function ifVariableExistsThen(args, util) {
        const name = String(args.NAME);
        if (_tempVariables.has(name)) {
            util.startBranch(1);
        }
    }

    function ifTemporaryVariableEquals(args, util) {
        const name = String(args.NAME);
        const value = args.VALUE;
        if (_tempVariables.has(name) && String(_tempVariables.get(name)) === String(value)) {
            util.startBranch(1);
        }
    }

    function ifTemporaryVariableEqualsElse(args, util) {
        const name = String(args.NAME);
        const value = args.VALUE;
        if (_tempVariables.has(name) && String(_tempVariables.get(name)) === String(value)) {
            util.startBranch(1); // Execute if branch
        } else {
            util.startBranch(2); // Execute else branch
        }
    }

    function ifElseVariable(args, util) {
        const name = String(args.NAME);
        const value = args.VALUE;
        let conditionMet = false;

        if (_tempVariables.has(name)) {
            const varValue = _tempVariables.get(name);
            switch (args.CONDITION_TYPE) {
                case 'equals':
                    conditionMet = String(varValue) === String(value);
                    break;
                case 'greater than':
                    conditionMet = parseNumber(varValue) > parseNumber(value);
                    break;
                case 'less than':
                    conditionMet = parseNumber(varValue) < parseNumber(value);
                    break;
                default:
                    conditionMet = false;
            }
        }

        if (conditionMet) {
            util.startBranch(1); // Execute if branch
        } else {
            util.startBranch(2); // Execute else branch
        }
    }

    // --- Temporary Variables Calculation Blocks Functions ---

    function incrementVariable(args) {
        changeTemporaryVariableBy({ NAME: args.NAME, AMOUNT: 1 });
    }

    function decrementVariable(args) {
        changeTemporaryVariableBy({ NAME: args.NAME, AMOUNT: -1 });
    }

    function multiplyVariableBy(args) {
        const name = String(args.NAME);
        const factor = parseNumber(args.FACTOR);
        if (_tempVariables.has(name)) {
            let currentValue = parseNumber(_tempVariables.get(name));
            _tempVariables.set(name, currentValue * factor);
        } else {
            // If variable doesn't exist, initialize it with 0 * factor = 0
            _tempVariables.set(name, 0);
        }
    }

    function divideVariableBy(args) {
        const name = String(args.NAME);
        const divisor = parseNumber(args.DIVISOR);
        if (_tempVariables.has(name)) {
            let currentValue = parseNumber(_tempVariables.get(name));
            if (divisor !== 0) { // Avoid division by zero
                _tempVariables.set(name, currentValue / divisor);
            } else {
                _tempVariables.set(name, 0); // Set to 0 on division by zero
            }
        } else {
            _tempVariables.set(name, 0); // If variable doesn't exist, initialize it with 0
        }
    }

    function roundVariable(args) {
        const name = String(args.NAME);
        if (_tempVariables.has(name)) {
            let currentValue = parseNumber(_tempVariables.get(name));
            _tempVariables.set(name, Math.round(currentValue));
        } else {
            _tempVariables.set(name, 0); // If variable doesn't exist, treat as 0
        }
    }

    function absVariable(args) {
        const name = String(args.NAME);
        let value = _tempVariables.has(name) ? parseNumber(_tempVariables.get(name)) : 0;
        return Math.abs(value);
    }

    function setVariableToJson(args) {
        const name = String(args.NAME);
        const jsonString = String(args.JSON_STRING);
        const parsed = parseJson(jsonString);
        if (parsed !== null) { // Only set if parsing was successful
            _tempVariables.set(name, parsed);
        } else {
            _tempVariables.set(name, jsonString); // Store as string if invalid JSON
        }
    }

    function appendToListVariable(args) {
        const name = String(args.NAME);
        const item = args.ITEM;
        let list = ensureArray(_tempVariables.get(name));
        list.push(item);
        _tempVariables.set(name, list);
    }

    function removeFromListVariable(args) {
        const name = String(args.NAME);
        const index = parseNumber(args.INDEX) - 1; // Scratch lists are 1-indexed
        let list = ensureArray(_tempVariables.get(name));
        if (index >= 0 && index < list.length) {
            list.splice(index, 1);
        }
        _tempVariables.set(name, list);
    }

    function constrainVariable(args) {
        const name = String(args.NAME);
        const min = parseNumber(args.MIN);
        const max = parseNumber(args.MAX);
        if (_tempVariables.has(name)) {
            let currentValue = parseNumber(_tempVariables.get(name));
            _tempVariables.set(name, Math.max(min, Math.min(max, currentValue)));
        } else {
            // If variable doesn't exist, initialize it to min if min <= 0 <= max, else to min
            _tempVariables.set(name, Math.max(min, Math.min(max, 0)));
        }
    }

    function concatenateVariables(args) {
        const name1 = String(args.NAME1);
        const name2 = String(args.NAME2);
        const resultName = String(args.RESULT_NAME);
        const val1 = _tempVariables.has(name1) ? String(_tempVariables.get(name1)) : "";
        const val2 = _tempVariables.has(name2) ? String(_tempVariables.get(name2)) : "";
        _tempVariables.set(resultName, val1 + val2);
    }

    // --- Temporary Variables Info Blocks Functions ---

    function isTemporaryVariableNumber(args) {
        const name = String(args.NAME);
        return typeof _tempVariables.get(name) === 'number';
    }

    function isTemporaryVariableBoolean(args) {
        const name = String(args.NAME);
        return typeof _tempVariables.get(name) === 'boolean';
    }

    function isTemporaryVariableString(args) {
        const name = String(args.NAME);
        return typeof _tempVariables.get(name) === 'string';
    }

    function isTemporaryVariableList(args) {
        const name = String(args.NAME);
        const value = _tempVariables.get(name);
        return Array.isArray(value) || (typeof value === 'string' && Array.isArray(parseJson(value)));
    }

    function countTemporaryVariables() {
        return _tempVariables.size;
    }

    function listOfTemporaryVariableNames() {
        // Return as a JSON string for easy conversion to Scratch List
        return JSON.stringify(Array.from(_tempVariables.keys()));
    }

    function getLengthOfListVariable(args) {
        const name = String(args.NAME);
        const list = ensureArray(_tempVariables.get(name));
        return list.length;
    }

    function getItemOfListVariable(args) {
        const name = String(args.NAME);
        const index = parseNumber(args.INDEX) - 1; // Scratch lists are 1-indexed
        const list = ensureArray(_tempVariables.get(name));
        if (index >= 0 && index < list.length) {
            return list[index];
        }
        return ""; // Return empty string if index is out of bounds or not a list
    }

    function variableAsJson(args) {
        const name = String(args.NAME);
        if (_tempVariables.has(name)) {
            try {
                return JSON.stringify(_tempVariables.get(name));
            } catch (e) {
                console.error("Failed to stringify variable to JSON:", name, e);
                return String(_tempVariables.get(name)); // Fallback to string representation
            }
        }
        return "null"; // Or "{}" or "[]" depending on desired default for non-existent
    }


    // --- Extension Definition ---
    class TemporaryVariablesExtension {
        constructor(runtime) {
            this.runtime = runtime;
        }

        getInfo() {
            const blockIconGet = "https://github.com/toxic5018/T4Extension/blob/main/assets/block1.png?raw=true"; // For get variable related blocks
            const blockIconSet = "https://github.com/toxic5018/T4Extension/blob/main/assets/block3.png?raw=true"; // For set, change, remove, value related blocks
            const mainColor = "#ff4d00"; // Orange
            const darkerColor = "#cc3d00"; // Darker orange for secondary color

            return {
                id: "toxic5018TemporaryVariables",
                name: "Temporary Variables",
                color1: mainColor,
                color2: darkerColor,
                menuIconURI: "https://github.com/toxic5018/T4Extension/blob/main/assets/temporaryvariables_extension_logo.png?raw=true",
                blocks: [
                    {
                        opcode: "extensionVersion",
                        blockType: Scratch.BlockType.LABEL,
                        text: "Version 1.0",
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    "---",
                    {
                        opcode: "labelTempVariables",
                        blockType: Scratch.BlockType.LABEL,
                        text: "-- Temporary Variables --",
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "setTemporaryVariable",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set temporary variable [NAME] to [VALUE]",
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "myVar" },
                            VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: "0" },
                        },
                        func: "setTemporaryVariable",
                        blockIconURI: blockIconSet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "getTemporaryVariable",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "temporary variable [NAME]",
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "myVar" },
                        },
                        func: "getTemporaryVariable",
                        blockIconURI: blockIconGet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "changeTemporaryVariableBy",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "change temporary variable [NAME] by [AMOUNT]",
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "myNumber" },
                            AMOUNT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
                        },
                        func: "changeTemporaryVariableBy",
                        blockIconURI: blockIconSet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "removeTemporaryVariable",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "remove temporary variable [NAME]",
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "myVar" },
                        },
                        func: "removeTemporaryVariable",
                        blockIconURI: blockIconSet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "clearAllTemporaryVariables",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "clear all temporary variables",
                        func: "clearAllTemporaryVariables",
                        blockIconURI: blockIconSet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "ifTemporaryVariableEquals",
                        blockType: Scratch.BlockType.CONDITIONAL,
                        text: "if temporary variable [NAME] = [VALUE] then",
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "myVar" },
                            VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: "0" },
                        },
                        func: "ifTemporaryVariableEquals",
                        blockIconURI: blockIconSet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "ifTemporaryVariableEqualsElse",
                        blockType: Scratch.BlockType.CONDITIONAL,
                        text: "if temporary variable [NAME] = [VALUE] then",
                        branchCount: 2, // Indicates this block has an 'else' branch
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "myVar" },
                            VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: "0" },
                        },
                        func: "ifTemporaryVariableEqualsElse",
                        blockIconURI: blockIconSet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "ifVariableExistsThen",
                        blockType: Scratch.BlockType.CONDITIONAL,
                        text: "if temporary variable [NAME] exists then",
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "myVar" },
                        },
                        func: "ifVariableExistsThen",
                        blockIconURI: blockIconSet, // Conditional blocks usually use the command icon style
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "ifElseVariable",
                        blockType: Scratch.BlockType.CONDITIONAL,
                        text: "if temporary variable [NAME] [CONDITION_TYPE] [VALUE] then",
                        branchCount: 2, // Indicates this block has an 'else' branch
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "myNum" },
                            CONDITION_TYPE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "variable_conditions",
                                defaultValue: "equals",
                            },
                            VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: "0" },
                        },
                        func: "ifElseVariable",
                        blockIconURI: blockIconSet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    "---",
                    {
                        opcode: "labelTempVariablesCalculation",
                        blockType: Scratch.BlockType.LABEL,
                        text: "-- Temporary Variables Calculation --",
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "incrementVariable",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "increment [NAME]",
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "counter" },
                        },
                        func: "incrementVariable",
                        blockIconURI: blockIconSet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "decrementVariable",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "decrement [NAME]",
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "counter" },
                        },
                        func: "decrementVariable",
                        blockIconURI: blockIconSet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "multiplyVariableBy",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "multiply [NAME] by [FACTOR]",
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "myNum" },
                            FACTOR: { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 },
                        },
                        func: "multiplyVariableBy",
                        blockIconURI: blockIconSet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "divideVariableBy",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "divide [NAME] by [DIVISOR]",
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "myNum" },
                            DIVISOR: { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 },
                        },
                        func: "divideVariableBy",
                        blockIconURI: blockIconSet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "roundVariable",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "round [NAME]",
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "myDecimal" },
                        },
                        func: "roundVariable",
                        blockIconURI: blockIconSet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "constrainVariable",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "constrain [NAME] between [MIN] and [MAX]",
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "value" },
                            MIN: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            MAX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
                        },
                        func: "constrainVariable",
                        blockIconURI: blockIconSet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "setVariableToJson",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set variable [NAME] to JSON [JSON_STRING]",
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "myJson" },
                            JSON_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: '{"key": "value"}' },
                        },
                        func: "setVariableToJson",
                        blockIconURI: blockIconSet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "appendToListVariable",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "append [ITEM] to list variable [NAME]",
                        arguments: {
                            ITEM: { type: Scratch.ArgumentType.STRING, defaultValue: "new item" },
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "myList" },
                        },
                        func: "appendToListVariable",
                        blockIconURI: blockIconSet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "removeFromListVariable",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "remove item [INDEX] from list variable [NAME]",
                        arguments: {
                            INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "myList" },
                        },
                        func: "removeFromListVariable",
                        blockIconURI: blockIconSet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "concatenateVariables",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "join [NAME1] and [NAME2] into [RESULT_NAME]",
                        arguments: {
                            NAME1: { type: Scratch.ArgumentType.STRING, defaultValue: "firstName" },
                            NAME2: { type: Scratch.ArgumentType.STRING, defaultValue: "lastName" },
                            RESULT_NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "fullName" },
                        },
                        func: "concatenateVariables",
                        blockIconURI: blockIconSet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    "---",
                    {
                        opcode: "labelTempVariablesInfo",
                        blockType: Scratch.BlockType.LABEL,
                        text: "-- Temporary Variables Info --",
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "absVariable",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "absolute value of [NAME]",
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "myNum" },
                        },
                        func: "absVariable",
                        blockIconURI: blockIconGet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "temporaryVariableExists",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "temporary variable [NAME] exists?",
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "myVar" },
                        },
                        func: "temporaryVariableExists",
                        blockIconURI: blockIconGet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "isTemporaryVariableNumber",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "is [NAME] a number?",
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "myNum" },
                        },
                        func: "isTemporaryVariableNumber",
                        blockIconURI: blockIconGet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "isTemporaryVariableBoolean",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "is [NAME] a boolean?",
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "myFlag" },
                        },
                        func: "isTemporaryVariableBoolean",
                        blockIconURI: blockIconGet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "isTemporaryVariableString",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "is [NAME] a string?",
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "myText" },
                        },
                        func: "isTemporaryVariableString",
                        blockIconURI: blockIconGet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "isTemporaryVariableList",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "is [NAME] a list?",
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "myList" },
                        },
                        func: "isTemporaryVariableList",
                        blockIconURI: blockIconGet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "countTemporaryVariables",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "number of temporary variables",
                        func: "countTemporaryVariables",
                        blockIconURI: blockIconGet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "listOfTemporaryVariableNames",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "list of temporary variable names (JSON)",
                        func: "listOfTemporaryVariableNames",
                        blockIconURI: blockIconGet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "getLengthOfListVariable",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "length of list variable [NAME]",
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "myList" },
                        },
                        func: "getLengthOfListVariable",
                        blockIconURI: blockIconGet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "getItemOfListVariable",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "item [INDEX] of list variable [NAME]",
                        arguments: {
                            INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "myList" },
                        },
                        func: "getItemOfListVariable",
                        blockIconURI: blockIconGet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                    {
                        opcode: "variableAsJson",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "variable [NAME] as JSON",
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "myVar" },
                        },
                        func: "variableAsJson",
                        blockIconURI: blockIconGet,
                        color1: mainColor,
                        color2: darkerColor,
                    },
                ],
                menus: {
                    variable_conditions: {
                        acceptReporters: true,
                        items: ["equals", "greater than", "less than"],
                    },
                },
            };
        }

        // --- Bind Functions to Extension ---
        setTemporaryVariable(args) { return setTemporaryVariable(args); }
        getTemporaryVariable(args) { return getTemporaryVariable(args); }
        changeTemporaryVariableBy(args) { return changeTemporaryVariableBy(args); }
        removeTemporaryVariable(args) { return removeTemporaryVariable(args); }
        temporaryVariableExists(args) { return temporaryVariableExists(args); }
        clearAllTemporaryVariables() { return clearAllTemporaryVariables(); }

        // Conditional Blocks
        ifTemporaryVariableEquals(args, util) { return ifTemporaryVariableEquals(args, util); }
        ifTemporaryVariableEqualsElse(args, util) { return ifTemporaryVariableEqualsElse(args, util); }
        ifVariableExistsThen(args, util) { return ifVariableExistsThen(args, util); }
        ifElseVariable(args, util) { return ifElseVariable(args, util); }

        // Calculation Blocks
        incrementVariable(args) { return incrementVariable(args); }
        decrementVariable(args) { return decrementVariable(args); }
        multiplyVariableBy(args) { return multiplyVariableBy(args); }
        divideVariableBy(args) { return divideVariableBy(args); }
        roundVariable(args) { return roundVariable(args); }
        absVariable(args) { return absVariable(args); }
        setVariableToJson(args) { return setVariableToJson(args); }
        appendToListVariable(args) { return appendToListVariable(args); }
        removeFromListVariable(args) { return removeFromListVariable(args); }
        constrainVariable(args) { return constrainVariable(args); }
        concatenateVariables(args) { return concatenateVariables(args); }

        // Info Blocks
        isTemporaryVariableNumber(args) { return isTemporaryVariableNumber(args); }
        isTemporaryVariableBoolean(args) { return isTemporaryVariableBoolean(args); }
        isTemporaryVariableString(args) { return isTemporaryVariableString(args); }
        isTemporaryVariableList(args) { return isTemporaryVariableList(args); }
        countTemporaryVariables() { return countTemporaryVariables(); }
        listOfTemporaryVariableNames() { return listOfTemporaryVariableNames(); }
        getLengthOfListVariable(args) { return getLengthOfListVariable(args); }
        getItemOfListVariable(args) { return getItemOfListVariable(args); }
        variableAsJson(args) { return variableAsJson(args); }
    }

    Scratch.extensions.register(new TemporaryVariablesExtension());
})(Scratch);