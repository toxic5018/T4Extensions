// JSON & Array Extension
// Made by Toxic5018
// Follow my website: https://toxic5018.github.io/toxic5018.me/

(async function (Scratch) {
    if (!Scratch.extensions.unsandboxed) {
        alert("This extension needs to be unsandboxed for full JSON and Array functionality!");
        return;
    }

    // --- Internal State Variables ---
    let _lastOperationError = "";
    let _lastOperationStatus = "";

    // Internal storage for the "current" JSON and Array,
    // though most blocks will operate directly on string inputs for flexibility.
    let _currentJsonString = "{}";
    let _currentArrayString = "[]";

    // --- Utility Functions ---
    function parseJsonString(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            _lastOperationError = ""; // Clear previous error on successful parse
            return parsed;
        } catch (e) {
            _lastOperationError = `JSON Parse Error: ${e.message}`;
            _lastOperationStatus = "Failed to parse JSON.";
            return null;
        }
    }

    function stringifyJson(obj) {
        try {
            const stringified = JSON.stringify(obj);
            _lastOperationError = ""; // Clear previous error on successful stringify
            return stringified;
        } catch (e) {
            _lastOperationError = `JSON Stringify Error: ${e.message}`;
            _lastOperationStatus = "Failed to stringify JSON.";
            return "";
        }
    }

    // Helper to parse values intelligently (string, number, boolean, null, JSON object/array)
    function parseValue(valueString) {
        if (typeof valueString !== 'string') return valueString; // Already parsed or non-string
        valueString = valueString.trim();
        if (valueString === '') return ''; // Keep empty string as empty string

        try {
            // Try to parse as JSON (for objects/arrays)
            const parsed = JSON.parse(valueString);
            return parsed;
        } catch (e) {
            // Not JSON, try other types
            if (valueString.toLowerCase() === 'true') return true;
            if (valueString.toLowerCase() === 'false') return false;
            if (valueString.toLowerCase() === 'null') return null;
            
            // Check if it's a number, but be careful with strings like "1.0.0" or "0xAF"
            // Use Number() constructor for a more robust check than isNaN on direct string
            if (!isNaN(Number(valueString)) && !isNaN(parseFloat(valueString))) return Number(valueString);
            
            return valueString; // Default to string
        }
    }

    // Helper to navigate and operate on JSON paths
    function getJsonPathValue(obj, pathParts) {
        let current = obj;
        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            if (Array.isArray(current)) {
                const index = parseInt(part, 10);
                if (isNaN(index) || index < 0 || index >= current.length) {
                    _lastOperationError = `Invalid array index in path: ${part}`;
                    return undefined;
                }
                current = current[index];
            } else if (typeof current === 'object' && current !== null && current.hasOwnProperty(part)) {
                current = current[part];
            } else {
                return undefined; // Path not found
            }
        }
        return current;
    }

    function setJsonPathValue(obj, pathParts, value) {
        if (!obj || typeof obj !== 'object' || pathParts.length === 0) {
            _lastOperationError = "Invalid JSON object or empty path.";
            return false;
        }
        let current = obj;
        for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            if (Array.isArray(current)) {
                const index = parseInt(part, 10);
                if (isNaN(index) || index < 0 || index >= current.length) {
                    _lastOperationError = `Invalid array index for setting path: ${part}`;
                    return false;
                }
                if (typeof current[index] !== 'object' || current[index] === null) {
                    current[index] = {}; // Auto-create nested object if needed
                }
                current = current[index];
            } else if (typeof current === 'object' && current !== null) {
                if (!current.hasOwnProperty(part) || typeof current[part] !== 'object' || current[part] === null) {
                    current[part] = {}; // Auto-create nested object if needed
                }
                current = current[part];
            } else {
                _lastOperationError = `Path segment is not an object/array at '${pathParts.slice(0, i+1).join('/')}'.`;
                return false;
            }
        }
        const lastPart = pathParts[pathParts.length - 1];
        if (Array.isArray(current)) {
            const index = parseInt(lastPart, 10);
            if (!isNaN(index) && index >= 0) {
                 if (index > current.length) { // Allow "pushing" if index is exactly current length
                    _lastOperationError = `Array index ${index} out of bounds for setting, max index is ${current.length - 1}.`;
                    return false;
                }
                current[index] = value;
            } else {
                 _lastOperationError = `Invalid array index for setting: ${lastPart}`;
                 return false;
            }
        } else if (typeof current === 'object' && current !== null) {
            current[lastPart] = value;
        } else {
            _lastOperationError = "Cannot set value on non-object/non-array path.";
            return false;
        }
        return true;
    }

    function deleteJsonPath(obj, pathParts) {
        if (!obj || typeof obj !== 'object' || pathParts.length === 0) return false;
        let current = obj;
        for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            if (Array.isArray(current)) {
                const index = parseInt(part, 10);
                if (isNaN(index) || index < 0 || index >= current.length) {
                    return false; // Path not found or invalid
                }
                current = current[index];
            } else if (typeof current === 'object' && current !== null && current.hasOwnProperty(part)) {
                current = current[part];
            } else {
                return false; // Path not found
            }
        }
        const lastPart = pathParts[pathParts.length - 1];
        if (Array.isArray(current)) {
            const index = parseInt(lastPart, 10);
            if (!isNaN(index) && index >= 0 && index < current.length) {
                current.splice(index, 1);
                return true;
            }
        } else if (typeof current === 'object' && current !== null && current.hasOwnProperty(lastPart)) {
            delete current[lastPart];
            return true;
        }
        return false;
    }


    // --- JSON Blocks Functions ---
    function createEmptyJsonObject() {
        _lastOperationError = "";
        _lastOperationStatus = "Empty JSON object created.";
        _currentJsonString = "{}";
    }

    function createJson(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        try {
            const jsonObject = {};
            if (args.KEY && args.VALUE) {
                jsonObject[args.KEY] = parseValue(args.VALUE);
                _currentJsonString = stringifyJson(jsonObject);
                _lastOperationStatus = "JSON object created.";
            } else {
                 _lastOperationError = "Key and Value cannot be empty for simple JSON object creation.";
                 _lastOperationStatus = "Failed to create JSON object.";
                 _currentJsonString = "{}";
            }
        } catch (e) {
            _lastOperationError = `Error creating JSON object: ${e.message}`;
            _lastOperationStatus = "Failed to create JSON object.";
            _currentJsonString = "{}";
        }
    }

    function createJsonFromString(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        const parsed = parseJsonString(args.JSON_STRING);
        if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
            _currentJsonString = args.JSON_STRING;
            _lastOperationStatus = "JSON object set from string.";
        } else {
            _lastOperationError = "Input string is not a valid JSON object.";
            _lastOperationStatus = "Failed to create JSON from string.";
            _currentJsonString = "{}";
        }
    }

    function setJsonValueAt(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        let jsonObject = parseJsonString(args.JSON_STRING);
        if (jsonObject === null) return; 

        try {
            const pathParts = args.PATH.split('/').filter(p => p);
            const valueToSet = parseValue(args.VALUE);

            if (setJsonPathValue(jsonObject, pathParts, valueToSet)) {
                _currentJsonString = stringifyJson(jsonObject);
                _lastOperationStatus = `Value set at path '${args.PATH}'.`;
            } else {
                _lastOperationStatus = `Failed to set value at path '${args.PATH}'.`;
            }
        } catch (e) {
            _lastOperationError = `Error setting JSON value: ${e.message}`;
            _lastOperationStatus = "Failed to set JSON value.";
        }
    }

    function getJsonValueAt(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        let jsonObject = parseJsonString(args.JSON_STRING);
        if (jsonObject === null) return "";

        try {
            const pathParts = args.PATH.split('/').filter(p => p);
            const value = getJsonPathValue(jsonObject, pathParts);
            if (value === undefined) {
                _lastOperationStatus = `Path '${args.PATH}' not found.`;
                return "";
            }
            if (typeof value === 'object' && value !== null) {
                return stringifyJson(value);
            }
            _lastOperationStatus = `Value retrieved from path '${args.PATH}'.`;
            return String(value);
        } catch (e) {
            _lastOperationError = `Error getting JSON value: ${e.message}`;
            _lastOperationStatus = "Failed to get JSON value.";
            return "";
        }
    }

    function deleteJsonPathBlock(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        let jsonObject = parseJsonString(args.JSON_STRING);
        if (jsonObject === null) return;

        try {
            const pathParts = args.PATH.split('/').filter(p => p);
            if (deleteJsonPath(jsonObject, pathParts)) {
                _currentJsonString = stringifyJson(jsonObject);
                _lastOperationStatus = `Path '${args.PATH}' deleted.`;
            } else {
                _lastOperationError = _lastOperationError || "Path not found or could not be deleted.";
                _lastOperationStatus = `Failed to delete path '${args.PATH}'.`;
            }
        } catch (e) {
            _lastOperationError = `Error deleting JSON path: ${e.message}`;
            _lastOperationStatus = "Failed to delete JSON path.";
        }
    }

    function isValidJsonString(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        try {
            JSON.parse(args.JSON_STRING);
            _lastOperationStatus = "JSON string is valid.";
            return true;
        } catch (e) {
            _lastOperationError = `Invalid JSON: ${e.message}`;
            _lastOperationStatus = "JSON string is invalid.";
            return false;
        }
    }

    function jsonPathExistsBlock(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        let jsonObject = parseJsonString(args.JSON_STRING);
        if (jsonObject === null) return false;

        try {
            const pathParts = args.PATH.split('/').filter(p => p);
            const value = getJsonPathValue(jsonObject, pathParts);
            const exists = (value !== undefined);
            _lastOperationStatus = `Path '${args.PATH}' exists: ${exists}.`;
            return exists;
        }
        catch (e) {
            _lastOperationError = `Error checking JSON path existence: ${e.message}`;
            _lastOperationStatus = "Failed to check JSON path existence.";
            return false;
        }
    }

    function getJsonPropertyCount(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        let jsonObject = parseJsonString(args.JSON_STRING);
        if (jsonObject === null) return 0;

        try {
            const pathParts = args.PATH ? args.PATH.split('/').filter(p => p) : [];
            const target = pathParts.length > 0 ? getJsonPathValue(jsonObject, pathParts) : jsonObject;

            if (typeof target === 'object' && target !== null) {
                _lastOperationStatus = `Property count for path '${args.PATH || '/'}' retrieved.`;
                return Object.keys(target).length;
            }
            _lastOperationError = `Target at path '${args.PATH || '/'}' is not an object.`;
            _lastOperationStatus = "Failed to get property count.";
            return 0;
        } catch (e) {
            _lastOperationError = `Error getting JSON property count: ${e.message}`;
            _lastOperationStatus = "Failed to get property count.";
            return 0;
        }
    }
    
    function getJsonKeys(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        let jsonObject = parseJsonString(args.JSON_STRING);
        if (jsonObject === null) return "";

        try {
            const pathParts = args.PATH ? args.PATH.split('/').filter(p => p) : [];
            const target = pathParts.length > 0 ? getJsonPathValue(jsonObject, pathParts) : jsonObject;

            if (typeof target === 'object' && target !== null && !Array.isArray(target)) {
                _lastOperationStatus = `Keys for path '${args.PATH || '/'}' retrieved.`;
                return Object.keys(target).join(',');
            }
            _lastOperationError = `Target at path '${args.PATH || '/'}' is not an object.`;
            _lastOperationStatus = "Failed to get JSON keys.";
            return "";
        } catch (e) {
            _lastOperationError = `Error getting JSON keys: ${e.message}`;
            _lastOperationStatus = "Failed to get JSON keys.";
            return "";
        }
    }

    function getJsonValues(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        let jsonObject = parseJsonString(args.JSON_STRING);
        if (jsonObject === null) return "";

        try {
            const pathParts = args.PATH ? args.PATH.split('/').filter(p => p) : [];
            const target = pathParts.length > 0 ? getJsonPathValue(jsonObject, pathParts) : jsonObject;

            if (typeof target === 'object' && target !== null && !Array.isArray(target)) {
                _lastOperationStatus = `Values for path '${args.PATH || '/'}' retrieved.`;
                return Object.values(target).map(v => {
                    if (typeof v === 'object' && v !== null) return stringifyJson(v);
                    return String(v);
                }).join(',');
            }
            _lastOperationError = `Target at path '${args.PATH || '/'}' is not an object.`;
            _lastOperationStatus = "Failed to get JSON values.";
            return "";
        } catch (e) {
            _lastOperationError = `Error getting JSON values: ${e.message}`;
            _lastOperationStatus = "Failed to get JSON values.";
            return "";
        }
    }

    function mergeJsonObjects(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        let json1 = parseJsonString(args.JSON1);
        let json2 = parseJsonString(args.JSON2);

        if (json1 === null || typeof json1 !== 'object' || Array.isArray(json1)) {
            _lastOperationError = "JSON 1 is not a valid JSON object.";
            _lastOperationStatus = "Failed to merge JSON.";
            return;
        }
        if (json2 === null || typeof json2 !== 'object' || Array.isArray(json2)) {
            _lastOperationError = "JSON 2 is not a valid JSON object.";
            _lastOperationStatus = "Failed to merge JSON.";
            return;
        }

        try {
            const merged = { ...json1, ...json2 }; // Simple shallow merge
            _currentJsonString = stringifyJson(merged);
            _lastOperationStatus = "JSON objects merged successfully.";
        } catch (e) {
            _lastOperationError = `Error merging JSON objects: ${e.message}`;
            _lastOperationStatus = "Failed to merge JSON.";
        }
    }

    function isJsonPathType(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        let jsonObject = parseJsonString(args.JSON_STRING);
        if (jsonObject === null) return false;

        try {
            const pathParts = args.PATH.split('/').filter(p => p);
            const value = getJsonPathValue(jsonObject, pathParts);
            
            let result = false;
            switch (args.TYPE) {
                case 'object': result = typeof value === 'object' && value !== null && !Array.isArray(value); break;
                case 'array': result = Array.isArray(value); break;
                case 'string': result = typeof value === 'string'; break;
                case 'number': result = typeof value === 'number'; break;
                case 'boolean': result = typeof value === 'boolean'; break;
                case 'null': result = value === null; break;
                default: result = false; break;
            }
            _lastOperationStatus = `Type check for path '${args.PATH}' is '${args.TYPE}': ${result}.`;
            return result;

        } catch (e) {
            _lastOperationError = `Error checking JSON path type: ${e.message}`;
            _lastOperationStatus = "Failed to check JSON path type.";
            return false;
        }
    }


    function getCurrentJsonString() {
        return _currentJsonString;
    }


    // --- Array Blocks Functions ---
    function createEmptyArrayBlock() {
        _lastOperationError = "";
        _lastOperationStatus = "Empty array created.";
        _currentArrayString = "[]";
    }

    function createArrayFromItemsBlock(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        try {
            const items = [];
            const rawItems = args.ITEMS_STRING.split(',').map(item => item.trim());
            for (const item of rawItems) {
                items.push(parseValue(item));
            }
            _currentArrayString = stringifyJson(items);
            _lastOperationStatus = "Array created from items.";
        } catch (e) {
            _lastOperationError = `Error creating array from items: ${e.message}`;
            _lastOperationStatus = "Failed to create array.";
            _currentArrayString = "[]";
        }
    }

    function createArrayFromStringSplit(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        try {
            const arr = args.STRING.split(args.DELIMITER);
            _currentArrayString = stringifyJson(arr);
            _lastOperationStatus = "Array created by splitting string.";
        } catch (e) {
            _lastOperationError = `Error creating array from string split: ${e.message}`;
            _lastOperationStatus = "Failed to create array by splitting.";
            _currentArrayString = "[]";
        }
    }

    function addArrayItemBlock(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        let arr = parseJsonString(args.ARRAY_STRING);
        if (!Array.isArray(arr)) {
            _lastOperationError = "Input is not a valid array string.";
            _lastOperationStatus = "Failed to add item.";
            return;
        }
        try {
            arr.push(parseValue(args.ITEM));
            _currentArrayString = stringifyJson(arr);
            _lastOperationStatus = "Item added to array.";
        } catch (e) {
            _lastOperationError = `Error adding array item: ${e.message}`;
            _lastOperationStatus = "Failed to add item.";
        }
    }

    function insertArrayItemBlock(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        let arr = parseJsonString(args.ARRAY_STRING);
        if (!Array.isArray(arr)) {
            _lastOperationError = "Input is not a valid array string.";
            _lastOperationStatus = "Failed to insert item.";
            return;
        }
        const index = Math.max(0, parseInt(args.INDEX, 10)); 
        if (isNaN(index)) {
             _lastOperationError = "Invalid index provided.";
             _lastOperationStatus = "Failed to insert item.";
             return;
        }

        try {
            arr.splice(index, 0, parseValue(args.ITEM));
            _currentArrayString = stringifyJson(arr);
            _lastOperationStatus = "Item inserted into array.";
        } catch (e) {
            _lastOperationError = `Error inserting array item: ${e.message}`;
            _lastOperationStatus = "Failed to insert item.";
        }
    }

    function removeArrayItemAtIndexBlock(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        let arr = parseJsonString(args.ARRAY_STRING);
        if (!Array.isArray(arr)) {
            _lastOperationError = "Input is not a valid array string.";
            _lastOperationStatus = "Failed to remove item.";
            return;
        }
        const index = parseInt(args.INDEX, 10);
        if (isNaN(index) || index < 0 || index >= arr.length) {
            _lastOperationError = "Invalid index for removal.";
            _lastOperationStatus = "Failed to remove item.";
            return;
        }
        try {
            arr.splice(index, 1);
            _currentArrayString = stringifyJson(arr);
            _lastOperationStatus = "Item removed from array by index.";
        } catch (e) {
            _lastOperationError = `Error removing array item by index: ${e.message}`;
            _lastOperationStatus = "Failed to remove item.";
        }
    }

    function removeFirstOccurrenceOfArrayItemBlock(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        let arr = parseJsonString(args.ARRAY_STRING);
        if (!Array.isArray(arr)) {
            _lastOperationError = "Input is not a valid array string.";
            _lastOperationStatus = "Failed to remove item.";
            return;
        }
        const itemToRemove = parseValue(args.ITEM);
        const index = arr.findIndex(item => item === itemToRemove); // Use findIndex for more robust comparison including objects
        if (index > -1) {
            try {
                arr.splice(index, 1);
                _currentArrayString = stringifyJson(arr);
                _lastOperationStatus = "First occurrence of item removed from array.";
            } catch (e) {
                _lastOperationError = `Error removing array item: ${e.message}`;
                _lastOperationStatus = "Failed to remove item.";
            }
        } else {
            _lastOperationStatus = "Item not found in array.";
        }
    }

    function getArrayItemBlock(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        let arr = parseJsonString(args.ARRAY_STRING);
        if (!Array.isArray(arr)) {
            _lastOperationError = "Input is not a valid array string.";
            _lastOperationStatus = "Failed to get item.";
            return "";
        }
        const index = parseInt(args.INDEX, 10);
        if (isNaN(index) || index < 0 || index >= arr.length) {
            _lastOperationError = "Invalid index for getting item.";
            _lastOperationStatus = "Failed to get item.";
            return "";
        }
        try {
            const item = arr[index];
            _lastOperationStatus = "Item retrieved from array.";
            return typeof item === 'object' && item !== null ? stringifyJson(item) : String(item);
        } catch (e) {
            _lastOperationError = `Error getting array item: ${e.message}`;
            _lastOperationStatus = "Failed to get item.";
            return "";
        }
    }
    
    function getArrayIndex(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        let arr = parseJsonString(args.ARRAY_STRING);
        if (!Array.isArray(arr)) {
            _lastOperationError = "Input is not a valid array string.";
            _lastOperationStatus = "Failed to get index.";
            return -1;
        }
        const itemToFind = parseValue(args.ITEM);
        const index = arr.findIndex(item => item === itemToFind);
        _lastOperationStatus = `Index of item '${args.ITEM}' in array: ${index}.`;
        return index;
    }


    function getArrayLengthBlock(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        let arr = parseJsonString(args.ARRAY_STRING);
        if (!Array.isArray(arr)) {
            _lastOperationError = "Input is not a valid array string.";
            _lastOperationStatus = "Failed to get length.";
            return 0;
        }
        _lastOperationStatus = "Array length retrieved.";
        return arr.length;
    }

    function arrayContainsItemBlock(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        let arr = parseJsonString(args.ARRAY_STRING);
        if (!Array.isArray(arr)) {
            _lastOperationError = "Input is not a valid array string.";
            _lastOperationStatus = "Failed to check item existence.";
            return false;
        }
        const itemToCheck = parseValue(args.ITEM);
        const contains = arr.includes(itemToCheck);
        _lastOperationStatus = `Array contains item: ${contains}.`;
        return contains;
    }

    function isArrayEmptyBlock(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        let arr = parseJsonString(args.ARRAY_STRING);
        if (!Array.isArray(arr)) {
            _lastOperationError = "Input is not a valid array string.";
            _lastOperationStatus = "Failed to check if empty (non-array input).";
            return true; 
        }
        const empty = arr.length === 0;
        _lastOperationStatus = `Array is empty: ${empty}.`;
        return empty;
    }

    function isArrayJsonString(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        try {
            const parsed = JSON.parse(args.ARRAY_STRING);
            const isValid = Array.isArray(parsed);
            _lastOperationStatus = `String is valid JSON array: ${isValid}.`;
            return isValid;
        } catch (e) {
            _lastOperationError = `Invalid JSON array string: ${e.message}`;
            _lastOperationStatus = "String is not a valid JSON array.";
            return false;
        }
    }

    function joinArrayWithDelimiterBlock(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        let arr = parseJsonString(args.ARRAY_STRING);
        if (!Array.isArray(arr)) {
            _lastOperationError = "Input is not a valid array string.";
            _lastOperationStatus = "Failed to join array.";
            return "";
        }
        try {
            const joinedString = arr.join(args.DELIMITER);
            _lastOperationStatus = "Array joined.";
            return joinedString;
        } catch (e) {
            _lastOperationError = `Error joining array: ${e.message}`;
            _lastOperationStatus = "Failed to join array.";
            return "";
        }
    }

    function clearArrayBlock(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        let arr = parseJsonString(args.ARRAY_STRING); // Parse to validate, but we'll override _currentArrayString
        if (!Array.isArray(arr)) {
            _lastOperationError = "Input is not a valid array string. Cannot clear.";
            _lastOperationStatus = "Failed to clear array.";
            return;
        }
        try {
            _currentArrayString = "[]"; // Directly set to empty array string
            _lastOperationStatus = "Array cleared.";
        } catch (e) {
            _lastOperationError = `Error clearing array: ${e.message}`;
            _lastOperationStatus = "Failed to clear array.";
        }
    }
    
    function getArraySubarray(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        let arr = parseJsonString(args.ARRAY_STRING);
        if (!Array.isArray(arr)) {
            _lastOperationError = "Input is not a valid array string.";
            _lastOperationStatus = "Failed to get sub-array.";
            return "[]";
        }
        const startIndex = Math.max(0, parseInt(args.START, 10));
        const endIndex = Math.min(arr.length, parseInt(args.END, 10)); // Exclusive end index like JS slice.

        if (isNaN(startIndex) || isNaN(endIndex) || startIndex > endIndex) {
            _lastOperationError = "Invalid start or end index for sub-array.";
            _lastOperationStatus = "Failed to get sub-array.";
            return "[]";
        }

        try {
            const subArray = arr.slice(startIndex, endIndex); 
            _lastOperationStatus = "Sub-array retrieved.";
            return stringifyJson(subArray);
        } catch (e) {
            _lastOperationError = `Error getting sub-array: ${e.message}`;
            _lastOperationStatus = "Failed to get sub-array.";
            return "[]";
        }
    }

    function reverseArray(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        let arr = parseJsonString(args.ARRAY_STRING);
        if (!Array.isArray(arr)) {
            _lastOperationError = "Input is not a valid array string.";
            _lastOperationStatus = "Failed to reverse array.";
            return;
        }
        try {
            arr.reverse();
            _currentArrayString = stringifyJson(arr);
            _lastOperationStatus = "Array reversed.";
        } catch (e) {
            _lastOperationError = `Error reversing array: ${e.message}`;
            _lastOperationStatus = "Failed to reverse array.";
        }
    }

    function sortArray(args) {
        _lastOperationError = "";
        _lastOperationStatus = "";
        let arr = parseJsonString(args.ARRAY_STRING);
        if (!Array.isArray(arr)) {
            _lastOperationError = "Input is not a valid array string.";
            _lastOperationStatus = "Failed to sort array.";
            return;
        }
        try {
            arr.sort((a, b) => {
                // Basic numeric or string comparison
                if (typeof a === 'number' && typeof b === 'number') {
                    return args.ORDER === 'ascending' ? a - b : b - a;
                }
                const strA = String(a);
                const strB = String(b);
                return args.ORDER === 'ascending' ? strA.localeCompare(strB) : strB.localeCompare(strA);
            });
            _currentArrayString = stringifyJson(arr);
            _lastOperationStatus = "Array sorted.";
        } catch (e) {
            _lastOperationError = `Error sorting array: ${e.message}`;
            _lastOperationStatus = "Failed to sort array.";
        }
    }

    function getCurrentArrayString() {
        return _currentArrayString;
    }


    // --- Error & Status Reporting ---
    function getLastError() {
        return _lastOperationError;
    }

    function getLastOperationStatus() {
        return _lastOperationStatus;
    }


    // --- Extension Definition ---
    class JsonArrayExtension {
        constructor(runtime) {
            this.runtime = runtime;
        }

        getInfo() {
            const blockIcon5 = "https://github.com/toxic5018/T4Extensions/blob/main/assets/textures/block5.png?raw=true";

            // Colors
            const jsonColor1 = "#000080"; // Navy blue
            const jsonColor2 = "#000066"; // Darker navy blue
            const arrayColor1 = "#6495ED"; // Cornflower blue (light navy blue)
            const arrayColor2 = "#5B80D8"; // Slightly darker cornflower blue

            return {
                id: "toxic5018JsonArray",
                name: "JSON & Array",
                color1: jsonColor1, // Default to JSON color for main extension icon
                color2: jsonColor2,
                menuIconURI: "https://github.com/toxic5018/T4Extensions/blob/main/assets/textures/extensions/logo/jsonandarray_extension_logo.png?raw=true",
                blockIconURI: blockIcon5,
                blocks: [
                    {
                        opcode: "extensionVersion",
                        blockType: Scratch.BlockType.LABEL,
                        text: "Version 1.0",
                        blockIconURI: blockIcon5, 
                    },
                    "---",
                    {
                        opcode: "labelJsonBlocks",
                        blockType: Scratch.BlockType.LABEL,
                        text: "-- JSON Blocks --",
                        blockIconURI: blockIcon5,
                        color1: jsonColor1,
                        color2: jsonColor2,
                    },
                    {
                        opcode: "createEmptyJsonObject",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "create empty JSON object",
                        func: "createEmptyJsonObject",
                        blockIconURI: blockIcon5,
                        color1: jsonColor1,
                        color2: jsonColor2,
                    },
                    {
                        opcode: "createJson",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "create JSON object from key [KEY] value [VALUE]",
                        arguments: {
                            KEY: { type: Scratch.ArgumentType.STRING, defaultValue: "name" },
                            VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: "value" },
                        },
                        func: "createJson",
                        blockIconURI: blockIcon5,
                        color1: jsonColor1,
                        color2: jsonColor2,
                    },
                    {
                        opcode: "createJsonFromString",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "create JSON from string [JSON_STRING]",
                        arguments: {
                            JSON_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: '{"item":"value","number":123}' },
                        },
                        func: "createJsonFromString",
                        blockIconURI: blockIcon5,
                        color1: jsonColor1,
                        color2: jsonColor2,
                    },
                    {
                        opcode: "setJsonValueAt",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "in JSON [JSON_STRING] set path [PATH] to [VALUE]",
                        arguments: {
                            JSON_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: "{}" },
                            PATH: { type: Scratch.ArgumentType.STRING, defaultValue: "data/item" },
                            VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: "new_value" },
                        },
                        func: "setJsonValueAt",
                        blockIconURI: blockIcon5,
                        color1: jsonColor1,
                        color2: jsonColor2,
                    },
                    {
                        opcode: "getJsonValueAt",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "get from JSON [JSON_STRING] path [PATH]",
                        arguments: {
                            JSON_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: "{}" },
                            PATH: { type: Scratch.ArgumentType.STRING, defaultValue: "data/item" },
                        },
                        func: "getJsonValueAt",
                        blockIconURI: blockIcon5,
                        color1: jsonColor1,
                        color2: jsonColor2,
                    },
                    {
                        opcode: "deleteJsonPathBlock",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "in JSON [JSON_STRING] delete path [PATH]",
                        arguments: {
                            JSON_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: "{}" },
                            PATH: { type: Scratch.ArgumentType.STRING, defaultValue: "data/item" },
                        },
                        func: "deleteJsonPathBlock",
                        blockIconURI: blockIcon5,
                        color1: jsonColor1,
                        color2: jsonColor2,
                    },
                    {
                        opcode: "isValidJsonString",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "is JSON [JSON_STRING] valid?",
                        arguments: {
                            JSON_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: '{"key":"value"}' },
                        },
                        func: "isValidJsonString",
                        blockIconURI: blockIcon5,
                        color1: jsonColor1,
                        color2: jsonColor2,
                    },
                    {
                        opcode: "jsonPathExistsBlock",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "in JSON [JSON_STRING] path [PATH] exists?",
                        arguments: {
                            JSON_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: '{"a":{"b":1}}' },
                            PATH: { type: Scratch.ArgumentType.STRING, defaultValue: "a/b" },
                        },
                        func: "jsonPathExistsBlock",
                        blockIconURI: blockIcon5,
                        color1: jsonColor1,
                        color2: jsonColor2,
                    },
                    {
                        opcode: "getJsonPropertyCount",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "number of properties in JSON [JSON_STRING] at path [PATH]",
                        arguments: {
                            JSON_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: '{"a":1,"b":2}' },
                            PATH: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
                        },
                        func: "getJsonPropertyCount",
                        blockIconURI: blockIcon5,
                        color1: jsonColor1,
                        color2: jsonColor2,
                    },
                    {
                        opcode: "getJsonKeys",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "get keys from JSON [JSON_STRING] at path [PATH]",
                        arguments: {
                            JSON_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: '{"key1":"val1","key2":"val2"}' },
                            PATH: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
                        },
                        func: "getJsonKeys",
                        blockIconURI: blockIcon5,
                        color1: jsonColor1,
                        color2: jsonColor2,
                    },
                    {
                        opcode: "getJsonValues",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "get values from JSON [JSON_STRING] at path [PATH]",
                        arguments: {
                            JSON_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: '{"key1":"val1","key2":123}' },
                            PATH: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
                        },
                        func: "getJsonValues",
                        blockIconURI: blockIcon5,
                        color1: jsonColor1,
                        color2: jsonColor2,
                    },
                     {
                        opcode: "mergeJsonObjects",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "merge JSON [JSON1] with [JSON2]",
                        arguments: {
                            JSON1: { type: Scratch.ArgumentType.STRING, defaultValue: '{"a":1, "b":2}' },
                            JSON2: { type: Scratch.ArgumentType.STRING, defaultValue: '{"b":3, "c":4}' },
                        },
                        func: "mergeJsonObjects",
                        blockIconURI: blockIcon5,
                        color1: jsonColor1,
                        color2: jsonColor2,
                    },
                    {
                        opcode: "isJsonPathType",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "in JSON [JSON_STRING] path [PATH] is [TYPE]?",
                        arguments: {
                            JSON_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: '{"name":"test","age":10,"active":true,"data":[1,2],"info":{}}' },
                            PATH: { type: Scratch.ArgumentType.STRING, defaultValue: "name" },
                            TYPE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "json_types",
                                defaultValue: "string",
                            },
                        },
                        func: "isJsonPathType",
                        blockIconURI: blockIcon5,
                        color1: jsonColor1,
                        color2: jsonColor2,
                    },
                    {
                        opcode: "getCurrentJsonString",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "current JSON string",
                        func: "getCurrentJsonString",
                        blockIconURI: blockIcon5,
                        color1: jsonColor1,
                        color2: jsonColor2,
                    },
                    "---",
                    {
                        opcode: "labelArrayBlocks",
                        blockType: Scratch.BlockType.LABEL,
                        text: "-- Array Blocks --",
                        blockIconURI: blockIcon5,
                        color1: arrayColor1,
                        color2: arrayColor2,
                    },
                    {
                        opcode: "createEmptyArrayBlock",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "create empty array",
                        func: "createEmptyArrayBlock",
                        blockIconURI: blockIcon5,
                        color1: arrayColor1,
                        color2: arrayColor2,
                    },
                     {
                        opcode: "createArrayFromItemsBlock",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "create array from items [ITEMS_STRING]",
                        arguments: {
                            ITEMS_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: "apple, banana, orange" },
                        },
                        func: "createArrayFromItemsBlock",
                        blockIconURI: blockIcon5,
                        color1: arrayColor1,
                        color2: arrayColor2,
                    },
                    {
                        opcode: "createArrayFromStringSplit",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "create array by splitting string [STRING] by delimiter [DELIMITER]",
                        arguments: {
                            STRING: { type: Scratch.ArgumentType.STRING, defaultValue: "item1,item2,item3" },
                            DELIMITER: { type: Scratch.ArgumentType.STRING, defaultValue: "," },
                        },
                        func: "createArrayFromStringSplit",
                        blockIconURI: blockIcon5,
                        color1: arrayColor1,
                        color2: arrayColor2,
                    },
                    {
                        opcode: "addArrayItemBlock",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "in array [ARRAY_STRING] add item [ITEM]",
                        arguments: {
                            ARRAY_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: "[]" },
                            ITEM: { type: Scratch.ArgumentType.STRING, defaultValue: "new item" },
                        },
                        func: "addArrayItemBlock",
                        blockIconURI: blockIcon5,
                        color1: arrayColor1,
                        color2: arrayColor2,
                    },
                    {
                        opcode: "insertArrayItemBlock",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "in array [ARRAY_STRING] insert item [ITEM] at index [INDEX]",
                        arguments: {
                            ARRAY_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: "[]" },
                            ITEM: { type: Scratch.ArgumentType.STRING, defaultValue: "inserted item" },
                            INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                        },
                        func: "insertArrayItemBlock",
                        blockIconURI: blockIcon5,
                        color1: arrayColor1,
                        color2: arrayColor2,
                    },
                    {
                        opcode: "removeArrayItemAtIndexBlock",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "in array [ARRAY_STRING] remove item at index [INDEX]",
                        arguments: {
                            ARRAY_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: "[1,2,3]" },
                            INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                        },
                        func: "removeArrayItemAtIndexBlock",
                        blockIconURI: blockIcon5,
                        color1: arrayColor1,
                        color2: arrayColor2,
                    },
                    {
                        opcode: "removeFirstOccurrenceOfArrayItemBlock",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "in array [ARRAY_STRING] remove first occurrence of item [ITEM]",
                        arguments: {
                            ARRAY_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: "[1,2,3,2]" },
                            ITEM: { type: Scratch.ArgumentType.STRING, defaultValue: "2" },
                        },
                        func: "removeFirstOccurrenceOfArrayItemBlock",
                        blockIconURI: blockIcon5,
                        color1: arrayColor1,
                        color2: arrayColor2,
                    },
                    {
                        opcode: "getArrayItemBlock",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "get from array [ARRAY_STRING] item at index [INDEX]",
                        arguments: {
                            ARRAY_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: "[10,20,30]" },
                            INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                        },
                        func: "getArrayItemBlock",
                        blockIconURI: blockIcon5,
                        color1: arrayColor1,
                        color2: arrayColor2,
                    },
                    {
                        opcode: "getArrayIndex",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "first index of [ITEM] in array [ARRAY_STRING]",
                        arguments: {
                            ITEM: { type: Scratch.ArgumentType.STRING, defaultValue: "banana" },
                            ARRAY_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: "[\"apple\",\"banana\",\"orange\"]" },
                        },
                        func: "getArrayIndex",
                        blockIconURI: blockIcon5,
                        color1: arrayColor1,
                        color2: arrayColor2,
                    },
                    {
                        opcode: "getArrayLengthBlock",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "length of array [ARRAY_STRING]",
                        arguments: {
                            ARRAY_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: "[1,2,3]" },
                        },
                        func: "getArrayLengthBlock",
                        blockIconURI: blockIcon5,
                        color1: arrayColor1,
                        color2: arrayColor2,
                    },
                    {
                        opcode: "arrayContainsItemBlock",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "array [ARRAY_STRING] contains item [ITEM]?",
                        arguments: {
                            ARRAY_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: "[1,2,3]" },
                            ITEM: { type: Scratch.ArgumentType.STRING, defaultValue: "2" },
                        },
                        func: "arrayContainsItemBlock",
                        blockIconURI: blockIcon5,
                        color1: arrayColor1,
                        color2: arrayColor2,
                    },
                    {
                        opcode: "isArrayEmptyBlock",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "is array [ARRAY_STRING] empty?",
                        arguments: {
                            ARRAY_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: "[]" },
                        },
                        func: "isArrayEmptyBlock",
                        blockIconURI: blockIcon5,
                        color1: arrayColor1,
                        color2: arrayColor2,
                    },
                    {
                        opcode: "isArrayJsonString",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "is [ARRAY_STRING] a valid JSON array string?",
                        arguments: {
                            ARRAY_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: '["item1","item2"]' },
                        },
                        func: "isArrayJsonString",
                        blockIconURI: blockIcon5,
                        color1: arrayColor1,
                        color2: arrayColor2,
                    },
                    {
                        opcode: "joinArrayWithDelimiterBlock",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "join array [ARRAY_STRING] with [DELIMITER]",
                        arguments: {
                            ARRAY_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: "[\"a\",\"b\",\"c\"]" },
                            DELIMITER: { type: Scratch.ArgumentType.STRING, defaultValue: "," },
                        },
                        func: "joinArrayWithDelimiterBlock",
                        blockIconURI: blockIcon5,
                        color1: arrayColor1,
                        color2: arrayColor2,
                    },
                    {
                        opcode: "clearArrayBlock",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "clear array [ARRAY_STRING]",
                         arguments: {
                            ARRAY_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: "[1,2,3]" },
                        },
                        func: "clearArrayBlock",
                        blockIconURI: blockIcon5,
                        color1: arrayColor1,
                        color2: arrayColor2,
                    },
                    {
                        opcode: "getArraySubarray",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "get sub-array from [ARRAY_STRING] from index [START] to [END]",
                        arguments: {
                            ARRAY_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: "[10,20,30,40,50]" },
                            START: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
                            END: { type: Scratch.ArgumentType.NUMBER, defaultValue: 3 },
                        },
                        func: "getArraySubarray",
                        blockIconURI: blockIcon5,
                        color1: arrayColor1,
                        color2: arrayColor2,
                    },
                    {
                        opcode: "reverseArray",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "reverse array [ARRAY_STRING]",
                        arguments: {
                            ARRAY_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: "[1,2,3]" },
                        },
                        func: "reverseArray",
                        blockIconURI: blockIcon5,
                        color1: arrayColor1,
                        color2: arrayColor2,
                    },
                    {
                        opcode: "sortArray",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "sort array [ARRAY_STRING] [ORDER]",
                        arguments: {
                            ARRAY_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: "[3,1,2]" },
                            ORDER: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "sort_order",
                                defaultValue: "ascending",
                            },
                        },
                        func: "sortArray",
                        blockIconURI: blockIcon5,
                        color1: arrayColor1,
                        color2: arrayColor2,
                    },
                    {
                        opcode: "getCurrentArrayString",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "current array string",
                        func: "getCurrentArrayString",
                        blockIconURI: blockIcon5,
                        color1: arrayColor1,
                        color2: arrayColor2,
                    },
                    "---",
                    {
                        opcode: "labelErrorStatus",
                        blockType: Scratch.BlockType.LABEL,
                        text: "-- Error & Status --",
                        blockIconURI: blockIcon5,
                        color1: jsonColor1, 
                        color2: jsonColor2,
                    },
                    {
                        opcode: "getLastError",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "last error message",
                        func: "getLastError",
                        blockIconURI: blockIcon5,
                        color1: jsonColor1,
                        color2: jsonColor2,
                    },
                    {
                        opcode: "getLastOperationStatus",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "last operation status",
                        func: "getLastOperationStatus",
                        blockIconURI: blockIcon5,
                        color1: jsonColor1,
                        color2: jsonColor2,
                    },
                ],
                menus: {
                    json_types: {
                        acceptReporters: true,
                        items: ["object", "array", "string", "number", "boolean", "null"],
                    },
                    sort_order: {
                        acceptReporters: true,
                        items: ["ascending", "descending"],
                    },
                },
            };
        }

        // --- JSON Functions ---
        createEmptyJsonObject() { return createEmptyJsonObject(); }
        createJson(args) { return createJson(args); }
        createJsonFromString(args) { return createJsonFromString(args); }
        setJsonValueAt(args) { return setJsonValueAt(args); }
        getJsonValueAt(args) { return getJsonValueAt(args); }
        deleteJsonPathBlock(args) { return deleteJsonPathBlock(args); }
        isValidJsonString(args) { return isValidJsonString(args); }
        jsonPathExistsBlock(args) { return jsonPathExistsBlock(args); }
        getJsonPropertyCount(args) { return getJsonPropertyCount(args); }
        getJsonKeys(args) { return getJsonKeys(args); }
        getJsonValues(args) { return getJsonValues(args); }
        mergeJsonObjects(args) { return mergeJsonObjects(args); }
        isJsonPathType(args) { return isJsonPathType(args); }
        getCurrentJsonString() { return getCurrentJsonString(); }

        // --- Array Functions ---
        createEmptyArrayBlock() { return createEmptyArrayBlock(); }
        createArrayFromItemsBlock(args) { return createArrayFromItemsBlock(args); }
        createArrayFromStringSplit(args) { return createArrayFromStringSplit(args); }
        addArrayItemBlock(args) { return addArrayItemBlock(args); }
        insertArrayItemBlock(args) { return insertArrayItemBlock(args); }
        removeArrayItemAtIndexBlock(args) { return removeArrayItemAtIndexBlock(args); }
        removeFirstOccurrenceOfArrayItemBlock(args) { return removeFirstOccurrenceOfArrayItemBlock(args); }
        getArrayItemBlock(args) { return getArrayItemBlock(args); }
        getArrayIndex(args) { return getArrayIndex(args); }
        getArrayLengthBlock(args) { return getArrayLengthBlock(args); }
        arrayContainsItemBlock(args) { return arrayContainsItemBlock(args); }
        isArrayEmptyBlock(args) { return isArrayEmptyBlock(args); }
        isArrayJsonString(args) { return isArrayJsonString(args); }
        joinArrayWithDelimiterBlock(args) { return joinArrayWithDelimiterBlock(args); }
        clearArrayBlock(args) { return clearArrayBlock(args); }
        getArraySubarray(args) { return getArraySubarray(args); }
        reverseArray(args) { return reverseArray(args); }
        sortArray(args) { return sortArray(args); }
        getCurrentArrayString() { return getCurrentArrayString(); }

        // --- Error & Status Functions ---
        getLastError() { return getLastError(); }
        getLastOperationStatus() { return getLastOperationStatus(); }
    }

    Scratch.extensions.register(new JsonArrayExtension());
})(Scratch);