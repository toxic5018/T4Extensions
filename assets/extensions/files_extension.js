// Files Integration Extension
// Version 1.0
// Made by Toxic5018
// Follow my website: https://toxic5018.github.io/toxic5018.me/

(async function (Scratch) {
    if (!Scratch.extensions.unsandboxed) {
        alert("This extension needs to be unsandboxed to access file functions!");
        return;
    }

    // --- Extension Configuration ---
    const mainColor = "#ffbf00"; // Orange (removed gradient as requested)
    const blockIcon9 = "https://github.com/toxic5018/T4Extensions/blob/main/assets/textures/block9.png?raw=true";
    const blockIcon10 = "https://github.com/toxic5018/T4Extensions/blob/main/assets/textures/block10.png?raw=true";
    const menuIcon = "https://github.com/toxic5018/T4Extensions/blob/main/assets/textures/extensions/logo/files_extension_logo.png?raw=true";

    // --- Internal State ---
    let lastFileContent = null; // Stores content of the last opened file
    let lastFileName = "";
    let lastFileType = "";
    let lastFileSize = 0; // in bytes
    let lastErrorMessage = "";
    let lastOperationStatus = ""; // "success", "error", "pending", "cancelled"

    // 'auto': System decides (prefers modern picker), 'system': Force modern picker, 'fallback': Force fallback picker
    let preferredFilePickerMode = 'auto';

    const objectURLs = new Map(); // Store created object URLs to revoke them later

    // --- Utility Functions ---

    // Event Emitter for Hat Blocks
    const fireEvent = (eventName, detail = {}) => {
        Scratch.vm.runtime.emit(eventName, detail);
    };

    // Helper to update status and error
    const setStatus = (status, message = "") => {
        lastOperationStatus = status;
        lastErrorMessage = message;
        fireEvent('FILE_OPERATION_COMPLETED', { status: status, message: message });
    };

    // --- File Reading Helpers ---

    const readFileAsText = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    };

    const readFileAsDataURL = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    };

    const readFileAsArrayBuffer = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    };

    // --- File Writing/Downloading Helper ---

    const downloadBlob = async (blob, suggestedFileName) => {
        try {
            // Use File System Access API if available (modern browsers)
            if (window.showSaveFilePicker && (preferredFilePickerMode === 'auto' || preferredFilePickerMode === 'system')) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: suggestedFileName,
                    types: [{
                        description: 'All Files',
                        accept: {
                            'text/plain': ['.txt'],
                            'application/json': ['.json'],
                            'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'],
                            'audio/*': ['.mp3', '.wav', '.ogg'],
                            'video/*': ['.mp4', '.webm'],
                            'application/pdf': ['.pdf'],
                            'application/msword': ['.doc'],
                            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                            'application/vnd.ms-excel': ['.xls'],
                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                            'application/vnd.ms-powerpoint': ['.ppt'],
                            'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
                            'application/xml': ['.xml'],
                            'text/csv': ['.csv'],
                            'application/octet-stream': ['.bin', '.dat']
                        }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                setStatus("success", `File '${suggestedFileName}' saved.`);
                return true;
            } else {
                // Fallback for older browsers or if 'fallback' mode is preferred
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = suggestedFileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                setStatus("success", `File '${suggestedFileName}' downloaded.`);
                return true;
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                setStatus("cancelled", "File save operation cancelled by user.");
            } else {
                setStatus("error", `Failed to save file: ${error.message}`);
                console.error("File Save Error:", error);
            }
            return false;
        }
    };

    // Helper to create a Blob from string content
    const textToFileBlob = (text, mimeType = 'text/plain') => {
        return new Blob([text], { type: mimeType });
    };

    // Helper to convert data URL to Blob
    const dataURLToBlob = (dataurl) => {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/);
        if (!mime) {
            throw new Error("Invalid Data URL format: Missing MIME type.");
        }
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime[1] });
    };

    // Helper to convert ArrayBuffer to Base64
    const arrayBufferToBase64 = (buffer) => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    };

    // Helper to convert Base64 to ArrayBuffer
    const base64ToArrayBuffer = (base64) => {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    };

    // Helper to get file picker types based on desired read type
    const getFilePickerTypes = (readType) => {
        const types = [];
        let acceptString = "";

        switch (readType) {
            case "text":
                types.push({ description: 'Text Files', accept: { 'text/plain': ['.txt', '.log', '.md'] } });
                acceptString = ".txt,.log,.md";
                break;
            case "JSON":
                types.push({ description: 'JSON Files', accept: { 'application/json': ['.json'] } });
                acceptString = ".json";
                break;
            case "data URL (image/base64)":
                types.push({ description: 'Image Files', accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'] } });
                acceptString = "image/*";
                break;
            case "binary (ArrayBuffer)":
                types.push({ description: 'Binary Files', accept: { 'application/octet-stream': ['.bin', '.dat'], 'audio/*': ['.mp3', '.wav', '.ogg'], 'video/*': ['.mp4', '.webm'] } });
                acceptString = ".bin,.dat,.mp3,.wav,.ogg,.mp4,.webm";
                break;
            default:
                // Default to all common types if 'All Files' is effectively chosen or unknown type
                types.push({
                    description: 'All Supported Files',
                    accept: {
                        '*/*': [
                            '.txt', '.json', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg',
                            '.mp3', '.wav', '.ogg', '.mp4', '.webm',
                            '.bin', '.dat', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
                            '.xml', '.csv'
                        ]
                    }
                });
                acceptString = ""; // Let browser handle all types
                break;
        }
        return { types, acceptString };
    };


    // --- Main Extension Class ---
    class FilesIntegrationExtension {
        constructor(runtime) {
            this.runtime = runtime;
        }

        getInfo() {
            return {
                id: "toxic5018FilesIntegration",
                name: "Files Integration",
                color1: mainColor,
                menuIconURI: menuIcon,
                blocks: [
                    {
                        opcode: "extensionVersion",
                        blockType: Scratch.BlockType.LABEL,
                        text: "Version 1.0",
                        color1: mainColor,
                    },
                    "---",
                    {
                        opcode: "labelFileImport",
                        blockType: Scratch.BlockType.LABEL,
                        text: "-- File Import --",
                        color1: mainColor,
                    },
                    {
                        opcode: "setFileSelectorMode",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set file selector mode to [MODE]",
                        arguments: {
                            MODE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "fileSelectorMode"
                            }
                        },
                        func: "setFileSelectorMode",
                        blockIconURI: blockIcon9
                    },
                    {
                        opcode: "openFile",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "open file with type [FILE_TYPE]",
                        arguments: {
                            FILE_TYPE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "fileReadType"
                            }
                        },
                        func: "openFile",
                        blockIconURI: blockIcon9
                    },
                    {
                        opcode: "fileOpenedHat",
                        blockType: Scratch.BlockType.HAT,
                        text: "when a file is opened",
                        isEdgeActivated: false,
                        func: "fileOpenedHat",
                        blockIconURI: blockIcon9
                    },
                    {
                        opcode: "lastFileContent",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "last opened file content",
                        func: "lastFileContent",
                        blockIconURI: blockIcon10
                    },
                    {
                        opcode: "lastFileName",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "last opened file name",
                        func: "lastFileName",
                        blockIconURI: blockIcon10
                    },
                    {
                        opcode: "lastFileType",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "last opened file type",
                        func: "lastFileType",
                        blockIconURI: blockIcon10
                    },
                    {
                        opcode: "lastFileSize",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "last opened file size (bytes)",
                        func: "lastFileSize",
                        blockIconURI: blockIcon10
                    },
                    "---",
                    {
                        opcode: "labelFileExport",
                        blockType: Scratch.BlockType.LABEL,
                        text: "-- File Export --",
                        color1: mainColor,
                    },
                    {
                        opcode: "saveTextToFile",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "save text [TEXT_CONTENT] as file [FILE_NAME]",
                        arguments: {
                            TEXT_CONTENT: { type: Scratch.ArgumentType.STRING, defaultValue: "Hello, Scratch!" },
                            FILE_NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "my_text_file.txt" }
                        },
                        func: "saveTextToFile",
                        blockIconURI: blockIcon9
                    },
                    {
                        opcode: "saveJSONToFile",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "save JSON [JSON_CONTENT] as file [FILE_NAME]",
                        arguments: {
                            JSON_CONTENT: { type: Scratch.ArgumentType.STRING, defaultValue: '{"key": "value"}' },
                            FILE_NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "my_data.json" }
                        },
                        func: "saveJSONToFile",
                        blockIconURI: blockIcon9
                    },
                    {
                        opcode: "saveDataURLAsFile",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "save data URL [DATA_URL] as file [FILE_NAME]",
                        arguments: {
                            DATA_URL: { type: Scratch.ArgumentType.STRING, defaultValue: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" }, // A tiny transparent PNG
                            FILE_NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "my_image.png" }
                        },
                        func: "saveDataURLAsFile",
                        blockIconURI: blockIcon9
                    },
                     {
                        opcode: "saveBase64AsFile",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "save base64 [BASE64_CONTENT] as file [FILE_NAME] type [MIME_TYPE]",
                        arguments: {
                            BASE64_CONTENT: { type: Scratch.ArgumentType.STRING, defaultValue: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" },
                            FILE_NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "my_encoded_file.bin" },
                            MIME_TYPE: { type: Scratch.ArgumentType.STRING, defaultValue: "application/octet-stream" }
                        },
                        func: "saveBase64AsFile",
                        blockIconURI: blockIcon9
                    },
                    "---",
                    {
                        opcode: "labelFileManager",
                        blockType: Scratch.BlockType.LABEL,
                        text: "-- File Manager --",
                        color1: mainColor,
                    },
                    {
                        opcode: "getFileNameExtension",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "extension of file name [FILE_NAME]",
                        arguments: {
                            FILE_NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "document.txt" }
                        },
                        func: "getFileNameExtension",
                        blockIconURI: blockIcon10
                    },
                    {
                        opcode: "getFileNameWithoutExtension",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "name without extension of file [FILE_NAME]",
                        arguments: {
                            FILE_NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "document.txt" }
                        },
                        func: "getFileNameWithoutExtension",
                        blockIconURI: blockIcon10
                    },
                    {
                        opcode: "createObjectURLBlock",
                        blockType: Scratch.BlockType.REPORTER,
                        blockShape: Scratch.BlockShape.SQUARE,
                        text: "create object URL from data URL [DATA_URL]",
                        arguments: {
                            DATA_URL: { type: Scratch.ArgumentType.STRING, defaultValue: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" }
                        },
                        func: "createObjectURLBlock",
                        blockIconURI: blockIcon10
                    },
                    {
                        opcode: "revokeObjectURLBlock",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "revoke object URL [OBJECT_URL]",
                        arguments: {
                            OBJECT_URL: { type: Scratch.ArgumentType.STRING, defaultValue: "blob:http://..." }
                        },
                        func: "revokeObjectURLBlock",
                        blockIconURI: blockIcon9
                    },
                    "---",
                    {
                        opcode: "labelDataManager",
                        blockType: Scratch.BlockType.LABEL,
                        text: "-- Data Manager --",
                        color1: mainColor,
                    },
                    {
                        opcode: "stringToBase64",
                        blockType: Scratch.BlockType.REPORTER,
                        blockShape: Scratch.BlockShape.SQUARE,
                        text: "base64 of string [TEXT]",
                        arguments: {
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "Hello, World!" }
                        },
                        func: "stringToBase64",
                        blockIconURI: blockIcon10
                    },
                    {
                        opcode: "base64ToString",
                        blockType: Scratch.BlockType.REPORTER,
                        blockShape: Scratch.BlockShape.SQUARE,
                        text: "string from base64 [BASE64]",
                        arguments: {
                            BASE64: { type: Scratch.ArgumentType.STRING, defaultValue: "SGVsbG8sIFdvcmxkIQ==" }
                        },
                        func: "base64ToString",
                        blockIconURI: blockIcon10
                    },
                    {
                        opcode: "objectToJson",
                        blockType: Scratch.BlockType.REPORTER,
                        blockShape: Scratch.BlockShape.SQUARE,
                        text: "JSON from object [OBJECT]",
                        arguments: {
                            OBJECT: { type: Scratch.ArgumentType.STRING, defaultValue: "{ \"message\": \"hi\" }" }
                        },
                        func: "objectToJson",
                        blockIconURI: blockIcon10
                    },
                    {
                        opcode: "jsonToObject",
                        blockType: Scratch.BlockType.REPORTER,
                        blockShape: Scratch.BlockShape.SQUARE,
                        text: "object from JSON [JSON_STRING]",
                        arguments: {
                            JSON_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: "{ \"data\": 123 }" }
                        },
                        func: "jsonToObject",
                        blockIconURI: blockIcon10
                    },
                    {
                        opcode: "decodeURIComponentBlock",
                        blockType: Scratch.BlockType.REPORTER,
                        blockShape: Scratch.BlockShape.SQUARE,
                        text: "decode URI component [URI_COMPONENT]",
                        arguments: {
                            URI_COMPONENT: { type: Scratch.ArgumentType.STRING, defaultValue: "Hello%2C%20World%21" }
                        },
                        func: "decodeURIComponentBlock",
                        blockIconURI: blockIcon10
                    },
                    {
                        opcode: "encodeURIComponentBlock",
                        blockType: Scratch.BlockType.REPORTER,
                        blockShape: Scratch.BlockShape.SQUARE,
                        text: "encode URI component [TEXT]",
                        arguments: {
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "Hello, World!" }
                        },
                        func: "encodeURIComponentBlock",
                        blockIconURI: blockIcon10
                    },
                    "---",
                    {
                        opcode: "labelFileConversionManager",
                        blockType: Scratch.BlockType.LABEL,
                        text: "-- File Conversion Manager (dangerous) --",
                        color1: mainColor,
                    },
                    {
                        opcode: "arrayBufferToBase64Block",
                        blockType: Scratch.BlockType.REPORTER,
                        blockShape: Scratch.BlockShape.SQUARE,
                        text: "base64 from ArrayBuffer [ARRAY_BUFFER_CONTENT]",
                        arguments: {
                            ARRAY_BUFFER_CONTENT: { type: Scratch.ArgumentType.STRING, defaultValue: "[Binary Data: 12 bytes]" }
                        },
                        func: "arrayBufferToBase64Block",
                        blockIconURI: blockIcon10
                    },
                    {
                        opcode: "base64ToArrayBufferBlock",
                        blockType: Scratch.BlockType.REPORTER,
                        blockShape: Scratch.BlockShape.SQUARE,
                        text: "ArrayBuffer from base64 [BASE64_STRING]",
                        arguments: {
                            BASE64_STRING: { type: Scratch.ArgumentType.STRING, defaultValue: "SGVsbG8sIFdvcmxkIQ==" }
                        },
                        func: "base64ToArrayBufferBlock",
                        blockIconURI: blockIcon10
                    },
                    {
                        opcode: "dataURLToMimeType",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "MIME type of data URL [DATA_URL]",
                        arguments: {
                            DATA_URL: { type: Scratch.ArgumentType.STRING, defaultValue: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" }
                        },
                        func: "dataURLToMimeType",
                        blockIconURI: blockIcon10
                    },
                    {
                        opcode: "dataURLToRawBase64",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "raw base64 of data URL [DATA_URL]",
                        arguments: {
                            DATA_URL: { type: Scratch.ArgumentType.STRING, defaultValue: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" }
                        },
                        func: "dataURLToRawBase64",
                        blockIconURI: blockIcon10
                    },
                    {
                        opcode: "convertBytesToUnit",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "convert [BYTES] bytes to [UNIT]",
                        arguments: {
                            BYTES: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1024 },
                            UNIT: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "bytesUnit"
                            }
                        },
                        func: "convertBytesToUnit",
                        blockIconURI: blockIcon10
                    },
                    "---",
                    {
                        opcode: "labelFileFetchStatus",
                        blockType: Scratch.BlockType.LABEL,
                        text: "-- File Operation Status --",
                        color1: mainColor,
                    },
                    {
                        opcode: "lastOperationStatus",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "last file operation status",
                        func: "getLastOperationStatus",
                        blockIconURI: blockIcon10
                    },
                    {
                        opcode: "lastErrorMessage",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "last file error message",
                        func: "getLastErrorMessage",
                        blockIconURI: blockIcon10
                    },
                    {
                        opcode: "isFileOperationSuccessful",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "is last file operation successful?",
                        func: "isFileOperationSuccessful",
                        blockIconURI: blockIcon10
                    },
                    {
                        opcode: "isFileOperationCancelled",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "is last file operation cancelled?",
                        func: "isFileOperationCancelled",
                        blockIconURI: blockIcon10
                    },
                ],
                menus: {
                    fileReadType: {
                        acceptReporters: false,
                        items: ["text", "JSON", "data URL (image/base64)", "binary (ArrayBuffer)"],
                    },
                    fileSelectorMode: {
                        acceptReporters: false,
                        items: ["auto", "system (show modal)", "fallback (open immediately)"],
                    },
                    bytesUnit: {
                        acceptReporters: false,
                        items: ["bytes", "kilobytes", "megabytes", "gigabytes", "terabytes"],
                    },
                },
            };
        }

        // --- Block Handler Implementations ---

        // File Import Handlers
        setFileSelectorMode(args) {
            const mode = String(args.MODE);
            if (mode === "auto") {
                preferredFilePickerMode = 'auto';
            } else if (mode === "system (show modal)") {
                preferredFilePickerMode = 'system';
            } else if (mode === "fallback (open immediately)") {
                preferredFilePickerMode = 'fallback';
            }
            setStatus("success", `File selector mode set to ${preferredFilePickerMode}.`);
        }

        async openFile(args) {
            setStatus("pending", "Waiting for file selection...");
            try {
                const { types, acceptString } = getFilePickerTypes(args.FILE_TYPE);

                // Check preferred mode and availability of File System Access API
                const useSystemPicker = window.showOpenFilePicker && (preferredFilePickerMode === 'auto' || preferredFilePickerMode === 'system');

                if (useSystemPicker) {
                    const [fileHandle] = await window.showOpenFilePicker({
                        multiple: false,
                        types: types
                    });
                    const file = await fileHandle.getFile();
                    await this._handleFileRead(file, args.FILE_TYPE);
                } else {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.style.display = 'none';
                    if (acceptString) {
                        input.accept = acceptString; // Set accept attribute for filtering
                    }
                    document.body.appendChild(input);

                    const fileSelectedPromise = new Promise(resolve => {
                        input.onchange = async (e) => {
                            const file = e.target.files[0];
                            if (file) {
                                resolve(file);
                            } else {
                                resolve(null); // User cancelled
                            }
                            document.body.removeChild(input);
                        };
                    });

                    input.click();
                    const file = await fileSelectedPromise;

                    if (file) {
                        await this._handleFileRead(file, args.FILE_TYPE);
                    } else {
                        setStatus("cancelled", "File selection cancelled.");
                    }
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    setStatus("cancelled", "File selection cancelled by user.");
                } else {
                    setStatus("error", `Error opening file: ${error.message}`);
                    console.error("File Open Error:", error);
                }
            }
        }

        async _handleFileRead(file, readType) {
            lastFileName = file.name;
            lastFileType = file.type;
            lastFileSize = file.size;
            lastFileContent = null;

            try {
                switch (readType) {
                    case "text":
                        lastFileContent = await readFileAsText(file);
                        break;
                    case "JSON":
                        const textContent = await readFileAsText(file);
                        try {
                            lastFileContent = JSON.parse(textContent);
                        } catch (e) {
                            throw new Error("Invalid JSON format for selected file.");
                        }
                        break;
                    case "data URL (image/base64)":
                        if (file.size > 10 * 1024 * 1024) { // Increased to 10MB for data URL
                            throw new Error("File too large for Data URL (max 10MB recommended).");
                        }
                        lastFileContent = await readFileAsDataURL(file);
                        break;
                    case "binary (ArrayBuffer)":
                        lastFileContent = await readFileAsArrayBuffer(file);
                        break;
                    default:
                        throw new Error("Unsupported file read type.");
                }
                setStatus("success", `File '${lastFileName}' opened successfully.`);
                fireEvent('FILE_OPENED');
            } catch (error) {
                setStatus("error", `Failed to read file '${lastFileName}': ${error.message}`);
                console.error("File Read Error:", error);
            }
        }

        fileOpenedHat() {
            return true;
        }

        lastFileContent() {
            if (lastFileContent instanceof ArrayBuffer) {
                return `[Binary Data: ${lastFileContent.byteLength} bytes]`;
            }
            if (typeof lastFileContent === 'object' && lastFileContent !== null) {
                return JSON.stringify(lastFileContent);
            }
            return lastFileContent === null ? "" : String(lastFileContent);
        }

        lastFileName() { return lastFileName; }
        lastFileType() { return lastFileType; }
        lastFileSize() { return lastFileSize; }

        // File Export Handlers
        async saveTextToFile(args) {
            const content = String(args.TEXT_CONTENT);
            const fileName = String(args.FILE_NAME);
            const blob = textToFileBlob(content, 'text/plain');
            await downloadBlob(blob, fileName);
        }

        async saveJSONToFile(args) {
            let jsonContent;
            try {
                jsonContent = JSON.stringify(JSON.parse(String(args.JSON_CONTENT)), null, 2);
            } catch (e) {
                setStatus("error", `Invalid JSON content provided: ${e.message}`);
                return false;
            }
            const fileName = String(args.FILE_NAME);
            const blob = textToFileBlob(jsonContent, 'application/json');
            await downloadBlob(blob, fileName);
        }

        async saveDataURLAsFile(args) {
            const dataUrl = String(args.DATA_URL);
            const fileName = String(args.FILE_NAME);
            try {
                const blob = dataURLToBlob(dataUrl);
                await downloadBlob(blob, fileName);
            } catch (e) {
                setStatus("error", `Invalid Data URL provided: ${e.message}`);
            }
        }

        async saveBase64AsFile(args) {
            const base64Content = String(args.BASE64_CONTENT);
            const fileName = String(args.FILE_NAME);
            const mimeType = String(args.MIME_TYPE);
            try {
                const dataUrl = `data:${mimeType};base64,${base64Content}`;
                const blob = dataURLToBlob(dataUrl);
                await downloadBlob(blob, fileName);
            } catch (e) {
                setStatus("error", `Invalid Base64 content or MIME type: ${e.message}`);
            }
        }

        // File Manager Handlers
        getFileNameExtension(args) {
            const fileName = String(args.FILE_NAME);
            const lastDotIndex = fileName.lastIndexOf('.');
            if (lastDotIndex > -1 && lastDotIndex < fileName.length - 1) {
                return fileName.substring(lastDotIndex + 1);
            }
            return ""; // No extension
        }

        getFileNameWithoutExtension(args) {
            const fileName = String(args.FILE_NAME);
            const lastDotIndex = fileName.lastIndexOf('.');
            if (lastDotIndex > 0) { // Ensure dot is not the first character
                return fileName.substring(0, lastDotIndex);
            }
            return fileName; // No extension or starts with dot
        }

        createObjectURLBlock(args) {
            const dataUrl = String(args.DATA_URL);
            try {
                const blob = dataURLToBlob(dataUrl);
                const url = URL.createObjectURL(blob);
                objectURLs.set(url, true); // Keep track of created URLs for revoking
                setStatus("success", "Object URL created.");
                return url;
            } catch (e) {
                setStatus("error", `Failed to create object URL: ${e.message}`);
                return "";
            }
        }

        revokeObjectURLBlock(args) {
            const objectUrl = String(args.OBJECT_URL);
            if (objectURLs.has(objectUrl)) {
                URL.revokeObjectURL(objectUrl);
                objectURLs.delete(objectUrl);
                setStatus("success", "Object URL revoked.");
            } else {
                setStatus("error", "Object URL not found or already revoked.");
            }
        }

        // Data Manager Handlers
        stringToBase64(args) {
            return btoa(String(args.TEXT));
        }

        base64ToString(args) {
            try {
                return atob(String(args.BASE64));
            } catch (e) {
                setStatus("error", `Invalid Base64 string for decoding: ${e.message}`);
                return "";
            }
        }

        objectToJson(args) {
            try {
                const parsed = JSON.parse(String(args.OBJECT));
                return JSON.stringify(parsed, null, 2);
            } catch (e) {
                setStatus("error", `Invalid object/JSON format for conversion to JSON: ${e.message}`);
                return "";
            }
        }

        jsonToObject(args) {
            try {
                return JSON.stringify(JSON.parse(String(args.JSON_STRING)));
            } catch (e) {
                setStatus("error", `Invalid JSON string for conversion to object: ${e.message}`);
                return "";
            }
        }

        decodeURIComponentBlock(args) {
            try {
                return decodeURIComponent(String(args.URI_COMPONENT));
            } catch (e) {
                setStatus("error", `Error decoding URI component: ${e.message}`);
                return "";
            }
        }

        encodeURIComponentBlock(args) {
            return encodeURIComponent(String(args.TEXT));
        }

        // File Conversion Manager Handlers
        arrayBufferToBase64Block(args) {
            if (lastFileContent instanceof ArrayBuffer) {
                try {
                    return arrayBufferToBase64(lastFileContent);
                } catch (e) {
                    setStatus("error", `Error converting ArrayBuffer to Base64: ${e.message}`);
                    return "";
                }
            } else {
                setStatus("error", "Last opened file content is not an ArrayBuffer for Base64 conversion.");
                return "";
            }
        }

        base64ToArrayBufferBlock(args) {
            try {
                const buffer = base64ToArrayBuffer(String(args.BASE64_STRING));
                return `[Binary Data: ${buffer.byteLength} bytes]`;
            } catch (e) {
                setStatus("error", `Error converting Base64 to ArrayBuffer: ${e.message}`);
                return "";
            }
        }

        dataURLToMimeType(args) {
            const dataUrl = String(args.DATA_URL);
            const match = dataUrl.match(/^data:([^;]+);base64,/);
            if (match && match[1]) {
                return match[1];
            }
            setStatus("error", "Invalid Data URL format: Cannot extract MIME type.");
            return "";
        }

        dataURLToRawBase64(args) {
            const dataUrl = String(args.DATA_URL);
            const parts = dataUrl.split(',');
            if (parts.length === 2) {
                return parts[1];
            }
            setStatus("error", "Invalid Data URL format: Cannot extract raw Base64.");
            return "";
        }

        convertBytesToUnit(args) {
            const bytes = Number(args.BYTES);
            const unit = String(args.UNIT);
            const KB = 1024;
            const MB = KB * 1024;
            const GB = MB * 1024;
            const TB = GB * 1024;

            switch (unit) {
                case "bytes":
                    return bytes;
                case "kilobytes":
                    return bytes / KB;
                case "megabytes":
                    return bytes / MB;
                case "gigabytes":
                    return bytes / GB;
                case "terabytes":
                    return bytes / TB;
                default:
                    setStatus("error", `Unknown unit: ${unit}`);
                    return 0;
            }
        }

        // Status reporter blocks
        getLastOperationStatus() { return lastOperationStatus; }
        getLastErrorMessage() { return lastErrorMessage; }
        isFileOperationSuccessful() { return lastOperationStatus === "success"; }
        isFileOperationCancelled() { return lastOperationStatus === "cancelled"; }
    }

    Scratch.extensions.register(new FilesIntegrationExtension());
})(Scratch);