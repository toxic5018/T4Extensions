// Network Manager Extension
// Made by Toxic5018
// Follow my website: https://toxic5018.github.io/toxic5018.me/

(async function (Scratch) {
    if (!Scratch.extensions.unsandboxed) {
        alert("This extension needs to be unsandboxed to use Network Manager functions!");
        return;
    }

    // --- Extension Configuration ---
    const mainColor = "#7d9911"; // Specified color
    const blockIconNetwork = "https://github.com/toxic5018/T4Extensions/blob/main/assets/textures/block11.png?raw=true";
    const blockIconWifi = "https://github.com/toxic5018/T4Extensions/blob/main/assets/textures/block12.png?raw=true";
    const menuIcon = "https://github.com/toxic5018/T4Extensions/blob/main/assets/textures/extensions/logo/networkmanager_extension_logo.png?raw=true";

    // --- Internal State & Utilities ---
    let lastFetchedWebsiteData = "";
    let lastNetworkError = "";

    // Event Emitter for Hat Blocks
    const fireEvent = (eventName, detail = {}) => {
        Scratch.vm.runtime.emit(eventName, detail);
    };

    // --- Network Utilities ---
    function isOnline() {
        return navigator.onLine;
    }

    async function fetchURLContent(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.text();
        } catch (e) {
            lastNetworkError = e.message;
            return `Error: ${e.message}`;
        }
    }

    async function fetchURLJson(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (e) {
            lastNetworkError = e.message;
            return { error: e.message };
        }
    }

    function getBrowserUserAgent() {
        return navigator.userAgent;
    }

    function getLanguage() {
        return navigator.language;
    }

    function getPlatform() {
        return navigator.platform;
    }

    function getConnectionType() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection && connection.effectiveType) {
            return connection.effectiveType;
        }
        return "unknown";
    }

    function getDownloadSpeed() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection && connection.downlink) {
            return connection.downlink; // in Mbps
        }
        return -1;
    }

    // --- Network Manager Extension ---
    class NetworkManagerExtension {
        constructor() {
            this.lastFetchedWebsiteData = "";
        }

        getInfo() {
            return {
                id: 'networkmanager',
                name: 'Network Manager',
                color1: mainColor,
                menuIconURI: menuIcon,
                blocks: [
                    {
                        opcode: 'onOnlineStatusChange',
                        blockType: Scratch.BlockType.HAT,
                        text: 'when online status changes',
                        is () { return true; }, // Always enabled
                        arguments: {}
                    },
                    {
                        opcode: 'isOnlineBlock',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'is online?',
                        disableMonitor: false
                    },
                    {
                        opcode: 'getBrowserUserAgentBlock',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'browser user agent',
                        disableMonitor: false
                    },
                    {
                        opcode: 'getLanguageBlock',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'browser language',
                        disableMonitor: false
                    },
                    {
                        opcode: 'getPlatformBlock',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'operating system platform',
                        disableMonitor: false
                    },
                    {
                        opcode: 'getConnectionTypeBlock',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'network connection type',
                        disableMonitor: false
                    },
                    {
                        opcode: 'getDownloadSpeedBlock',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'estimated download speed (Mbps)',
                        disableMonitor: false
                    },
                    {
                        opcode: 'getLastNetworkErrorMessage',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'last network error message',
                        disableMonitor: false
                    },
                    '---', // Separator

                    // -- Network Website Manager --
                    {
                        opcode: 'fetchWebsiteContent',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'fetch content from URL [URL]',
                        arguments: {
                            URL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'https://toxic5018.github.io/toxic5018.me/'
                            }
                        },
                        func: 'fetchWebsiteContent',
                        blockIconURI: blockIconNetwork
                    },
                    {
                        opcode: 'fetchWebsiteJson',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'fetch JSON from URL [URL]',
                        arguments: {
                            URL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'https://toxic5018.github.io/toxic5018.me/example.json'
                            }
                        },
                        func: 'fetchWebsiteJson',
                        blockIconURI: blockIconNetwork
                    },
                    {
                        opcode: 'getLastFetchedWebsiteData',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'last fetched website data',
                        disableMonitor: false
                    },
                    {
                        opcode: 'getJsonValueFromLastFetchedData',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'get value from JSON path [PATH] in last fetched data',
                        arguments: {
                            PATH: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'key'
                            }
                        },
                        disableMonitor: false,
                        blockIconURI: blockIconNetwork
                    },
                    {
                        opcode: 'parseJsonString',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'parse JSON string [JSON_STRING] and get value from path [PATH]',
                        arguments: {
                            JSON_STRING: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: '{"data": "example"}'
                            },
                            PATH: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'data'
                            }
                        },
                        disableMonitor: false,
                        blockIconURI: blockIconNetwork
                    },
                    '---', // Separator

                    // -- Network Report --
                    {
                        opcode: 'getCurrentIPAddress',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'my public IP address',
                        disableMonitor: false,
                        blockIconURI: blockIconNetwork
                    },
                    {
                        opcode: 'getGeolocation',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'my geolocation data',
                        disableMonitor: false,
                        blockIconURI: blockIconNetwork
                    },
                    '---', // Separator

                    // -- WiFi Manager --
                    {
                        opcode: 'checkWifiConnection',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'is connected to WiFi?',
                        disableMonitor: false,
                        blockIconURI: blockIconWifi
                    },
                    {
                        opcode: 'getWifiSignalStrength',
                        blockType: Scratch.BlockType.NUMBER,
                        text: 'WiFi signal strength (0-100)',
                        disableMonitor: false,
                        blockIconURI: blockIconWifi
                    },
                    {
                        opcode: 'getConnectedSSID',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'connected WiFi network (SSID)',
                        disableMonitor: false,
                        blockIconURI: blockIconWifi
                    }
                ]
            };
        }

        // --- Network Manager ---
        isOnlineBlock() {
            return isOnline();
        }

        getBrowserUserAgentBlock() {
            return getBrowserUserAgent();
        }

        getLanguageBlock() {
            return getLanguage();
        }

        getPlatformBlock() {
            return getPlatform();
        }

        getConnectionTypeBlock() {
            return getConnectionType();
        }

        getDownloadSpeedBlock() {
            return getDownloadSpeed();
        }

        getLastNetworkErrorMessage() {
            return lastNetworkError;
        }

        // -- Network Website Manager --
        async fetchWebsiteContent(args) {
            this.lastFetchedWebsiteData = await fetchURLContent(args.URL);
        }

        async fetchWebsiteJson(args) {
            const jsonData = await fetchURLJson(args.URL);
            this.lastFetchedWebsiteData = JSON.stringify(jsonData);
        }

        getLastFetchedWebsiteData() {
            return this.lastFetchedWebsiteData;
        }

        getJsonValueFromLastFetchedData(args) {
            try {
                const data = JSON.parse(this.lastFetchedWebsiteData);
                const path = args.PATH.split('.');
                let current = data;
                for (let i = 0; i < path.length; i++) {
                    if (current === null || typeof current !== 'object' || !current.hasOwnProperty(path[i])) {
                        return ""; // Path not found
                    }
                    current = current[path[i]];
                }
                return typeof current === 'object' ? JSON.stringify(current) : String(current);
            } catch (e) {
                lastNetworkError = `JSON parsing error: ${e.message}`;
                return "";
            }
        }

        parseJsonString(args) {
            try {
                const data = JSON.parse(args.JSON_STRING);
                const path = args.PATH.split('.');
                let current = data;
                for (let i = 0; i < path.length; i++) {
                    if (current === null || typeof current !== 'object' || !current.hasOwnProperty(path[i])) {
                        return ""; // Path not found
                    }
                    current = current[path[i]];
                }
                return typeof current === 'object' ? JSON.stringify(current) : String(current);
            } catch (e) {
                lastNetworkError = `JSON parsing error: ${e.message}`;
                return "";
            }
        }

        // -- Network Report --
        async getCurrentIPAddress() {
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                return data.ip;
            } catch (e) {
                lastNetworkError = `IP address fetch error: ${e.message}`;
                return "Error fetching IP";
            }
        }

        async getGeolocation() {
            return new Promise((resolve) => {
                if ("geolocation" in navigator) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const lat = position.coords.latitude;
                            const lon = position.coords.longitude;
                            resolve(JSON.stringify({ latitude: lat, longitude: lon }));
                        },
                        (error) => {
                            lastNetworkError = `Geolocation error: ${error.message}`;
                            resolve(`Error getting geolocation: ${error.message}`);
                        }
                    );
                } else {
                    lastNetworkError = "Geolocation is not supported by this browser.";
                    resolve("Geolocation not supported.");
                }
            });
        }

        // -- WiFi Manager --
        checkWifiConnection() {
            // In a browser environment, direct WiFi detection is not possible for security reasons.
            // This block will rely on general online status or provide a placeholder.
            // For a Scratch extension, we'll assume "online" implies some network connection.
            return navigator.onLine && (getConnectionType() !== "cellular");
        }

        getWifiSignalStrength() {
            // Signal strength cannot be directly accessed in web browsers.
            // This is a placeholder or can be designed to return a simulated value if necessary.
            lastNetworkError = "Cannot directly access WiFi signal strength in a web browser due to security restrictions.";
            return -1; // Indicate not available
        }

        getConnectedSSID() {
            // SSID cannot be directly accessed in web browsers for security and privacy reasons.
            lastNetworkError = "Cannot directly access WiFi SSID in a web browser due to security restrictions.";
            return "Not Available";
        }
    }

    // Attach event listeners for online/offline status
    window.addEventListener('online', () => fireEvent('onlineStatusChange', { status: true }));
    window.addEventListener('offline', () => fireEvent('onOnlineStatusChange', { status: false }));

    Scratch.extensions.register(new NetworkManagerExtension());
})(Scratch);