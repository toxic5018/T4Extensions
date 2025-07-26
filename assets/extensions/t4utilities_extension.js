// T4Utilities Extension
// Made by Toxic5018
// Follow my website: https://toxic5108.github.io/toxic5108.me/

(async function (Scratch) {
    if (!Scratch.extensions.unsandboxed) {
        alert("This extension needs to be unsandboxed for T4Utilities functionality!");
        return;
    }

    // --- Extension Configuration ---
    const mainColor = "#1c59ff"; // Blue
    const gradientColor = "#c205ff"; // Purple
    const blockIcon = "https://github.com/toxic5018/T4Extensions/blob/main/assets/textures/block7.png?raw=true";
    const menuIcon = "https://github.com/toxic5018/T4Extensions/blob/main/assets/textures/extensions/logo/t4utilities_extension_logo.png?raw=true";


    class T4UtilitiesExtension {
        constructor(runtime) {
            this.runtime = runtime;
            this.lastBroadcastMessage = null; // For capturing T4 broadcast data
            this.lastBroadcastTargetName = null; // New: For capturing the target that sent the T4 broadcast
            this._isTabActive = document.visibilityState === 'visible';

            // Store references to the event listeners to clean them up on extension unload
            this.vmEventListeners = new Map();

            // Initialize global listeners once across all instances/reloads
            if (!window.__t4_listeners_initialized) {
                window.addEventListener('storage', this.handleStorageEvent.bind(this));
                window.addEventListener('online', this.handleOnlineEvent.bind(this));
                window.addEventListener('offline', this.handleOfflineEvent.bind(this));
                document.addEventListener('visibilitychange', this.handleVisibilityChangeEvent.bind(this));
                window.__t4_listeners_initialized = true; // Flag to prevent re-initialization
            }

            // Bind VM event listeners using Scratch.vm.runtime directly for robustness
            this.addVMEventListener('VARIABLE_SET', this.handleVariableSet.bind(this));
            this.addVMEventListener('PROJECT_START', this.handleProjectStart.bind(this));
            this.addVMEventListener('PROJECT_STOP_ALL', this.handleProjectStopAll.bind(this));

            // Emit extension loaded event once
            setTimeout(() => this.fireEvent('T4_EXTENSION_LOADED'), 0);
        }

        // --- Event Emitter ---
        fireEvent(eventName, detail = {}) {
            Scratch.vm.runtime.emit(eventName, detail);
        }

        // --- VM Event Listener Helper ---
        addVMEventListener(eventName, handler, filter = null) {
            const boundHandler = (data) => {
                if (filter === null || filter(data)) {
                    handler(data);
                }
            };
            // Use Scratch.vm.runtime.on instead of this.runtime.on
            Scratch.vm.runtime.on(eventName, boundHandler);
            this.vmEventListeners.set(eventName, boundHandler);
        }

        // --- VM Event Handlers ---
        handleVariableSet(variable) {
            this.fireEvent('T4_ANY_VARIABLE_CHANGE', { name: variable.name, value: variable.value });
            this.fireEvent('T4_SPECIFIC_VARIABLE_CHANGE_' + variable.name, { value: variable.value });
        }
        handleProjectStart() { this.fireEvent('T4_PROJECT_STARTS'); }
        handleProjectStopAll() { this.fireEvent('T4_PROJECT_STOPS'); }

        // --- Global Event Handlers ---
        handleStorageEvent(e) {
            this.fireEvent('T4_LOCAL_DATA_CHANGE', { key: e.key, oldValue: e.oldValue, newValue: e.newValue });
            this.fireEvent('T4_ANY_LOCAL_DATA_CHANGE');
        }
        handleOnlineEvent() { this.fireEvent('T4_ONLINE'); }
        handleOfflineEvent() { this.fireEvent('T4_OFFLINE'); }
        handleVisibilityChangeEvent() {
            if (document.visibilityState === 'visible') {
                this._isTabActive = true;
                this.fireEvent('T4_BROWSER_TAB_ACTIVE');
            } else {
                this._isTabActive = false;
                this.fireEvent('T4_BROWSER_TAB_INACTIVE');
            }
        }


        // --- T4 Manager (Local Data & System) Functions ---

        saveLocalData(args) {
            try {
                const key = String(args.KEY);
                const value = String(args.VALUE);
                localStorage.setItem(key, value);
                this.fireEvent('T4_LOCAL_DATA_CHANGE', { key: key, value: value });
            } catch (e) {
                console.error("T4Utilities: Failed to save local data", e);
            }
        }

        getLocalData(args) {
            try {
                const key = String(args.KEY);
                return localStorage.getItem(key) || "";
            } catch (e) {
                console.error("T4Utilities: Failed to get local data", e);
                return "";
            }
        }

        deleteLocalData(args) {
            try {
                const key = String(args.KEY);
                localStorage.removeItem(key);
                this.fireEvent('T4_LOCAL_DATA_CHANGE', { key: key, value: null });
            } catch (e) {
                console.error("T4Utilities: Failed to delete local data", e);
            }
        }

        clearAllLocalData() {
            try {
                localStorage.clear();
                this.fireEvent('T4_ANY_LOCAL_DATA_CHANGE');
            } catch (e) {
                console.error("T4Utilities: Failed to clear all local data", e);
            }
        }

        localDataExists(args) {
            try {
                const key = String(args.KEY);
                return localStorage.hasOwnProperty(key);
            } catch (e) {
                console.error("T4Utilities: Failed to check local data existence", e);
                return false;
            }
        }

        getAllLocalDataKeys() {
            try {
                const keys = [];
                for (let i = 0; i < localStorage.length; i++) {
                    keys.push(localStorage.key(i));
                }
                return JSON.stringify(keys);
            } catch (e) {
                console.error("T4Utilities: Failed to get all local data keys", e);
                return "[]";
            }
        }

        openURL(args) {
            const url = String(args.URL);
            try {
                window.open(url, '_blank');
            } catch (e) {
                console.error("T4Utilities: Failed to open URL", e);
            }
        }

        reloadProject() {
            this.fireEvent('T4_PROJECT_RELOAD_REQUESTED');
            setTimeout(() => {
                location.reload();
            }, 100);
        }

        copyToClipboard(args) {
            const text = String(args.TEXT);
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).catch(e => {
                    console.error("T4Utilities: Failed to copy to clipboard", e);
                });
            } else {
                console.warn("T4Utilities: Clipboard API not supported.");
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                } catch (e) {
                    console.error("T4Utilities: Fallback clipboard copy failed", e);
                }
                document.body.removeChild(textArea);
            }
        }

        isOnline() {
            return navigator.onLine;
        }

        getCurrentUnixTime() {
            return Math.floor(Date.now() / 1000);
        }

        generateUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }


        // --- T4 Project Values Functions (Requires VM access) ---

        findVariable(varName) {
            const targets = this.runtime.targets;
            for (const target of targets) {
                for (const variable of Object.values(target.variables)) {
                    if (variable.name === varName) {
                        return { target: target, variable: variable };
                    }
                }
            }
            return null;
        }

        setAnyVariable(args) {
            const varName = String(args.VAR_NAME);
            const value = args.VALUE;
            const found = this.findVariable(varName);
            if (found) {
                found.target.lookupVariableByNameAndType(varName, found.variable.type).value = value;
            }
        }

        getAnyVariable(args) {
            const varName = String(args.VAR_NAME);
            const found = this.findVariable(varName);
            if (found) {
                return found.variable.value;
            }
            return "";
        }

        getAllVariableNames() {
            const names = new Set();
            const targets = this.runtime.targets;
            for (const target of targets) {
                for (const variable of Object.values(target.variables)) {
                    if (variable.type === '') {
                        names.add(variable.name);
                    }
                }
            }
            return JSON.stringify(Array.from(names));
        }

        getAllVariableValues() {
            const variables = {};
            const targets = this.runtime.targets;
            for (const target of targets) {
                for (const variable of Object.values(target.variables)) {
                    if (variable.type === '') {
                        variables[variable.name] = variable.value;
                    }
                }
            }
            return JSON.stringify(variables);
        }

        getAllListNames() {
            const names = new Set();
            const targets = this.runtime.targets;
            for (const target of targets) {
                for (const variable of Object.values(target.variables)) {
                    if (variable.type === 'list') {
                        names.add(variable.name);
                    }
                }
            }
            return JSON.stringify(Array.from(names));
        }

        getListContent(args) {
            const listName = String(args.LIST_NAME);
            const targets = this.runtime.targets;
            for (const target of targets) {
                for (const variable of Object.values(target.variables)) {
                    if (variable.type === 'list' && variable.name === listName) {
                        return JSON.stringify(variable.value);
                    }
                }
            }
            return "[]";
        }

        // --- T4 Project Info Functions ---

        getProjectTitle() {
            return document.title.replace("Scratch - ", "") || "Untitled Project";
        }

        getVMFPS() {
            return this.runtime.frameLoop.framerate || 30;
        }

        getAllSpriteNames() {
            const spriteNames = [];
            const targets = this.runtime.targets;
            for (const target of targets) {
                if (!target.isStage) {
                    spriteNames.push(target.getName());
                }
            }
            return JSON.stringify(spriteNames);
        }

        getSpriteCount() {
            let count = 0;
            const targets = this.runtime.targets;
            for (const target of targets) {
                if (!target.isStage) {
                    count++;
                }
            }
            return count;
        }

        getSpriteLayer(args) {
            const spriteName = String(args.SPRITE_NAME);
            let target = null;
            for (const t of this.runtime.targets) {
                if (!t.isStage && t.getName() === spriteName) {
                    target = t;
                    break;
                }
            }
            if (target) {
                return "N/A (Advanced VM Feature)";
            }
            return "Sprite not found";
        }

        getStageWidth() {
            return this.runtime.stageWidth;
        }

        getStageHeight() {
            return this.runtime.stageHeight;
        }

        isTurboModeOn() {
            return this.runtime.turbo;
        }

        isSpriteHidden(args) {
            const spriteName = String(args.SPRITE_NAME);
            let target = null;
            for (const t of this.runtime.targets) {
                if (!t.isStage && t.getName() === spriteName) {
                    target = t;
                    break;
                }
            }
            if (target) {
                return target.visible === false;
            }
            return true;
        }

        // --- T4 Broadcast Manager Functions ---

        // Function to get all existing broadcast messages for a dynamic dropdown
        getBroadcastMessageMenu() {
            const broadcasts = new Set();
            const targets = this.runtime.targets;
            for (const target of targets) {
                for (const blockId in target.blocks._blocks) {
                    const block = target.blocks._blocks[blockId];
                    if (block.opcode === 'event_whenbroadcastreceived') {
                        if (block.fields && block.fields.BROADCAST_OPTION) {
                            broadcasts.add(block.fields.BROADCAST_OPTION.value);
                        }
                    }
                }
            }
            const uniqueBroadcasts = Array.from(broadcasts);
            uniqueBroadcasts.sort();
            return uniqueBroadcasts.map(msg => ({ text: msg, value: msg }));
        }

        // Send broadcast with optional data (JSON string) - Renamed for clarity
        sendT4BroadcastWithData(args) {
            const message = String(args.MESSAGE);
            const data = String(args.DATA);
            this.lastBroadcastMessage = { message: message, data: data };

            // Use Scratch.vm.runtime.sequencer for robustness
            const currentTarget = Scratch.vm.runtime.sequencer && Scratch.vm.runtime.sequencer.activeThread ? Scratch.vm.runtime.sequencer.activeThread.target : null;
            this.lastBroadcastTargetName = currentTarget ? currentTarget.getName() : "Stage";

            this.fireEvent('SPRITE_INFO_REPORT', {
                id: 'T4Broadcast',
                value: message
            });
            // Removed problematic Scratch.vm.runtime.broadcast call
        }

        getLastBroadcastData() {
            const data = this.lastBroadcastMessage ? this.lastBroadcastMessage.data : "";
            return data;
        }

        getLastT4BroadcastMessage() {
            return this.lastBroadcastMessage ? this.lastBroadcastMessage.message : "";
        }

        // NEW: Last Broadcast Target
        getLastBroadcastTarget() {
            const target = this.lastBroadcastTargetName;
            return target || "";
        }

        clearLastT4BroadcastInfo() {
            this.lastBroadcastMessage = null;
            this.lastBroadcastTargetName = null;
        }


        // --- GetInfo Method (Defines blocks and menus) ---
        getInfo() {
            return {
                id: "toxic5018T4Utilities",
                name: "T4 Utilities",
                color1: mainColor,
                color2: gradientColor,
                menuIconURI: menuIcon,
                blocks: [
                    {
                        opcode: "extensionVersion",
                        blockType: Scratch.BlockType.LABEL,
                        text: "Version 1.0",
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    "---",
                    {
                        opcode: "labelT4Manager",
                        blockType: Scratch.BlockType.LABEL,
                        text: "-- T4 Manager --",
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    // Hat Blocks for T4 Manager
                    {
                        opcode: "whenExtensionLoaded",
                        blockType: Scratch.BlockType.HAT,
                        text: "when T4 Utilities loads",
                        isEdgeActivated: false,
                        func: "handleExtensionLoaded",
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "whenLocalDataChanges",
                        blockType: Scratch.BlockType.HAT,
                        text: "when local data [KEY] changes",
                        arguments: {
                            KEY: { type: Scratch.ArgumentType.STRING, defaultValue: "myKey" },
                        },
                        isEdgeActivated: false,
                        func: "handleLocalDataChanges",
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "whenAnyLocalDataChanges",
                        blockType: Scratch.BlockType.HAT,
                        text: "when any local data changes",
                        isEdgeActivated: false,
                        func: "handleAnyLocalDataChanges",
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "whenOnline",
                        blockType: Scratch.BlockType.HAT,
                        text: "when online",
                        isEdgeActivated: false,
                        func: "handleOnline",
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "whenOffline",
                        blockType: Scratch.BlockType.HAT,
                        text: "when offline",
                        isEdgeActivated: false,
                        func: "handleOffline",
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "whenBrowserTabActive",
                        blockType: Scratch.BlockType.HAT,
                        text: "when browser tab becomes active",
                        isEdgeActivated: false,
                        func: "handleBrowserTabActive",
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "whenBrowserTabInactive",
                        blockType: Scratch.BlockType.HAT,
                        text: "when browser tab becomes inactive",
                        isEdgeActivated: false,
                        func: "handleBrowserTabInactive",
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    // Command Blocks for T4 Manager
                    {
                        opcode: "saveLocalData",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "save local data [KEY] as [VALUE]",
                        arguments: {
                            KEY: { type: Scratch.ArgumentType.STRING, defaultValue: "score" },
                            VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: "0" },
                        },
                        func: "saveLocalData",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "deleteLocalData",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "delete local data [KEY]",
                        arguments: {
                            KEY: { type: Scratch.ArgumentType.STRING, defaultValue: "score" },
                        },
                        func: "deleteLocalData",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "clearAllLocalData",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "clear all local data",
                        func: "clearAllLocalData",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "openURL",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "open URL [URL]",
                        arguments: {
                            URL: { type: Scratch.ArgumentType.STRING, defaultValue: "https://toxic5018.github.io/toxic5018.me/" },
                        },
                        func: "openURL",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "reloadProject",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "reload project",
                        func: "reloadProject",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "copyToClipboard",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "copy [TEXT] to clipboard",
                        arguments: {
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "Hello World!" },
                        },
                        func: "copyToClipboard",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    // Reporter Blocks for T4 Manager
                    {
                        opcode: "getLocalData",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "local data [KEY]",
                        arguments: {
                            KEY: { type: Scratch.ArgumentType.STRING, defaultValue: "score" },
                        },
                        func: "getLocalData",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "localDataExists",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "local data [KEY] exists?",
                        arguments: {
                            KEY: { type: Scratch.ArgumentType.STRING, defaultValue: "score" },
                        },
                        func: "localDataExists",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "getAllLocalDataKeys",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "all local data keys (JSON)",
                        func: "getAllLocalDataKeys",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "isOnline",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "is online?",
                        func: "isOnline",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "getCurrentUnixTime",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "current Unix time",
                        func: "getCurrentUnixTime",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "generateUUID",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "generate UUID",
                        func: "generateUUID",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    "---",
                    {
                        opcode: "labelT4ProjectValues",
                        blockType: Scratch.BlockType.LABEL,
                        text: "-- T4 Project Values --",
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    // Hat Blocks for T4 Project Values
                    {
                        opcode: "whenAnyVariableChanges",
                        blockType: Scratch.BlockType.HAT,
                        text: "when variable [VAR_NAME] changes",
                        arguments: {
                            VAR_NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "my var" },
                        },
                        isEdgeActivated: false,
                        func: "handleAnyVariableChanges",
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    // Command Blocks for T4 Project Values
                    {
                        opcode: "setAnyVariable",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set variable [VAR_NAME] to [VALUE]",
                        arguments: {
                            VAR_NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "my variable" },
                            VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: "0" },
                        },
                        func: "setAnyVariable",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    // Reporter Blocks for T4 Project Values
                    {
                        opcode: "getAnyVariable",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "value of variable [VAR_NAME]",
                        arguments: {
                            VAR_NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "my variable" },
                        },
                        func: "getAnyVariable",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "getAllVariableNames",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "all variable names (JSON)",
                        func: "getAllVariableNames",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "getAllVariableValues",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "all variable values (JSON)",
                        func: "getAllVariableValues",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "getAllListNames",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "all list names (JSON)",
                        func: "getAllListNames",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "getListContent",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "list [LIST_NAME] content (JSON)",
                        arguments: {
                            LIST_NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "my list" },
                        },
                        func: "getListContent",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    "---",
                    {
                        opcode: "labelT4ProjectInfo",
                        blockType: Scratch.BlockType.LABEL,
                        text: "-- T4 Project Info --",
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    // Hat Blocks for T4 Project Info
                    {
                        opcode: "whenProjectStarts_T4",
                        blockType: Scratch.BlockType.HAT,
                        text: "when T4 project starts",
                        isEdgeActivated: false,
                        func: "handleProjectStartsT4",
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "whenProjectStops_T4",
                        blockType: Scratch.BlockType.HAT,
                        text: "when T4 project stops",
                        isEdgeActivated: false,
                        func: "handleProjectStopsT4",
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    // Reporter Blocks for T4 Project Info
                    {
                        opcode: "getProjectTitle",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "project title",
                        func: "getProjectTitle",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "getVMFPS",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "VM FPS",
                        func: "getVMFPS",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "getAllSpriteNames",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "all sprite names (JSON)",
                        func: "getAllSpriteNames",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "getSpriteCount",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "sprite count",
                        func: "getSpriteCount",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "getSpriteLayer",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "layer of sprite [SPRITE_NAME]",
                        arguments: {
                            SPRITE_NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "Sprite1" },
                        },
                        func: "getSpriteLayer",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "getStageWidth",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "stage width",
                        func: "getStageWidth",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "getStageHeight",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "stage height",
                        func: "getStageHeight",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "isTurboModeOn",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "is turbo mode on?",
                        func: "isTurboModeOn",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "isSpriteHidden",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "is sprite [SPRITE_NAME] hidden?",
                        arguments: {
                            SPRITE_NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "Sprite1" },
                        },
                        func: "isSpriteHidden",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    "---",
                    {
                        opcode: "labelT4BroadcastManager",
                        blockType: Scratch.BlockType.LABEL,
                        text: "-- T4 Broadcast Manager --",
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    // Command Blocks for T4 Broadcast Manager
                    {
                        opcode: "sendT4BroadcastWithData",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "T4 broadcast [MESSAGE] with data [DATA]",
                        arguments: {
                            MESSAGE: { type: Scratch.ArgumentType.STRING, defaultValue: "message1" },
                            DATA: { type: Scratch.ArgumentType.STRING, defaultValue: "{}" },
                        },
                        func: "sendT4BroadcastWithData",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "clearLastT4BroadcastInfo",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "clear last T4 broadcast info",
                        func: "clearLastT4BroadcastInfo",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    // Reporter Blocks for T4 Broadcast Manager
                    {
                        opcode: "getLastBroadcastData",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "last T4 broadcast data (JSON)",
                        func: "getLastBroadcastData",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    {
                        opcode: "getLastT4BroadcastMessage",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "last T4 broadcast message",
                        func: "getLastT4BroadcastMessage",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                    // NEW: Last Broadcast Target
                    {
                        opcode: "getLastBroadcastTarget",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "last T4 broadcast target sprite",
                        func: "getLastBroadcastTarget",
                        blockIconURI: blockIcon,
                        color1: mainColor,
                        color2: gradientColor,
                    },
                ],
                menus: {
                    broadcastMenu: {
                        acceptReporters: true,
                        items: 'getBroadcastMessageMenu'
                    }
                },
            };
        }
    }

    Scratch.extensions.register(new T4UtilitiesExtension());
})(Scratch);