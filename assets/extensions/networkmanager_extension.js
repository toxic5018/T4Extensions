// Network Manager Extension
// Made by Toxic5018
// Follow my website: https://toxic5018.github.io/toxic5018.me/

(async function (Scratch) {
    if (!Scratch.extensions.unsandboxed) {
        alert("This extension needs to be unsandboxed for Network Manager functionality!");
        return;
    }

    // --- Extension Configuration ---
    const mainColor = "#7d9911"; // Greenish-brown
    const blockIconNetwork = "https://github.com/toxic5018/T4Extensions/blob/main/assets/textures/block11.png?raw=true";
    const blockIconWiFi = "https://github.com/toxic5018/T4Extensions/blob/main/assets/textures/block12.png?raw=true";
    const menuIcon = "https://github.com/toxic5018/T4Extensions/blob/main/assets/textures/extensions/logo/networkmanager_extension_logo.png?raw=true";

    // --- Internal State & Utilities ---
    let lastFetchedWebsiteData = "";
    let lastWebsiteStatusCode = 0;
    let lastWebsiteFetchError = "";
    let lastPingLatency = -1;
    let lastPingURL = "";
    let currentIPAddress = "N/A"; // Stores the last fetched public IP address

    // Helper to emit events for Hat Blocks
    const fireEvent = (eventName, detail = {}) => {
        Scratch.vm.runtime.emit(eventName, detail);
    };

    // --- Network Manager Functions ---

    /**
     * Checks if the browser is currently online.
     * @returns {boolean} True if online, false otherwise.
     */
    function isOnline() {
        return navigator.onLine;
    }

    /**
     * Gets the general network connection type (e.g., "wifi", "cellular", "ethernet").
     * @returns {string} The connection type or "unknown" if not available.
     */
    function getNetworkConnectionType() {
        if (navigator.connection && navigator.connection.type) {
            return navigator.connection.type;
        }
        return "unknown";
    }

    /**
     * Gets the effective network connection type (e.g., "slow-2g", "2g", "3g", "4g").
     * @returns {string} The effective connection type or "unknown" if not available.
     */
    function getEffectiveConnectionType() {
        if (navigator.connection && navigator.connection.effectiveType) {
            return navigator.connection.effectiveType;
        }
        return "unknown";
    }

    /**
     * Gets the estimated round-trip time (RTT) in milliseconds.
     * @returns {number} The RTT in milliseconds or -1 if not available.
     */
    function getNetworkRTT() {
        if (navigator.connection && navigator.connection.rtt !== undefined) {
            return navigator.connection.rtt;
        }
        return -1; // Not available
    }

    /**
     * Gets the estimated downlink speed in megabits per second (Mbps).
     * @returns {number} The downlink speed or -1 if not available.
     */
    function getNetworkDownlink() {
        if (navigator.connection && navigator.connection.downlink !== undefined) {
            return navigator.connection.downlink;
        }
        return -1; // Not available
    }

    /**
     * Checks if the user has enabled "Save Data" mode in their browser.
     * @returns {boolean} True if save data mode is enabled, false otherwise.
     */
    function isSaveDataModeEnabled() {
        if (navigator.connection && navigator.connection.saveData !== undefined) {
            return navigator.connection.saveData;
        }
        return false;
    }

    /**
     * Fetches the public IP address using an external service.
     * @returns {Promise<string>} The public IP address or an error message.
     */
    async function getPublicIPAddress() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            currentIPAddress = data.ip; // Store for monitor block
            return data.ip;
        } catch (error) {
            console.error("Failed to fetch public IP:", error);
            currentIPAddress = "Error fetching IP"; // Store error for monitor block
            return currentIPAddress;
        }
    }

    /**
     * Pings a URL to measure latency using a simple fetch request.
     * @param {object} args - Block arguments.
     * @param {string} args.URL - The URL to ping.
     * @returns {Promise<number>} The latency in milliseconds or -1 (no URL) / -2 (error).
     */
    async function pingURL(args) {
        const url = args.URL;
        if (!url) {
            lastPingLatency = -1;
            lastPingURL = "";
            return -1;
        }
        try {
            const start = performance.now();
            // Use no-cors for a simpler ping that doesn't care about response content
            await fetch(url, { mode: 'no-cors' });
            const end = performance.now();
            lastPingLatency = Math.round(end - start);
            lastPingURL = url;
            return lastPingLatency;
        } catch (error) {
            console.error("Failed to ping URL:", error);
            lastPingLatency = -2; // Indicates an error
            lastPingURL = url;
            return -2;
        }
    }

    // --- Website Fetch Data Functions ---

    /**
     * Fetches data from a given URL using specified method, body, and headers.
     * Stores the fetched data, status code, and any errors.
     * @param {object} args - Block arguments.
     * @param {string} args.URL - The URL to fetch from.
     * @param {string} args.METHOD - The HTTP method (GET, POST, PUT, etc.).
     * @param {string} args.BODY - The request body (for POST, PUT, PATCH).
     * @param {string} args.HEADERS - JSON string of request headers.
     * @returns {Promise<string>} The fetched text data or an empty string on error.
     */
    async function fetchWebsiteData(args) {
        const url = args.URL;
        const method = args.METHOD || "GET";
        const body = args.BODY || "";
        let headers = {};
        try {
            headers = args.HEADERS ? JSON.parse(args.HEADERS) : {};
        } catch (e) {
            console.warn("Invalid JSON for headers:", e);
            lastWebsiteFetchError = "Invalid headers JSON.";
            return "";
        }

        lastFetchedWebsiteData = "";
        lastWebsiteStatusCode = 0;
        lastWebsiteFetchError = "";

        try {
            const options = { method: method, headers: headers };
            if (method === "POST" || method === "PUT" || method === "PATCH") {
                options.body = body;
            }

            const response = await fetch(url, options);
            lastWebsiteStatusCode = response.status;
            const textData = await response.text();
            lastFetchedWebsiteData = textData;
            fireEvent('NETWORK_DATA_FETCHED', { url: url, status: response.status });
            return textData;
        } catch (error) {
            lastWebsiteFetchError = error.message;
            console.error("Error fetching website data:", error);
            fireEvent('NETWORK_FETCH_ERROR', { url: url, error: error.message });
            return "";
        }
    }

    /**
     * Returns the data from the last website fetch operation.
     * @returns {string} The last fetched data.
     */
    function getLastFetchedData() {
        return lastFetchedWebsiteData;
    }

    /**
     * Returns the HTTP status code from the last website fetch operation.
     * @returns {number} The last status code.
     */
    function getLastStatusCode() {
        return lastWebsiteStatusCode;
    }

    /**
     * Returns the error message from the last website fetch operation.
     * @returns {string} The last error message.
     */
    function getLastFetchError() {
        return lastWebsiteFetchError;
    }

    // --- Simple Boolean Network Functions ---

    /**
     * Checks if the network connection type is cellular.
     * @returns {boolean} True if cellular, false otherwise.
     */
    function isNetworkCellular() {
        return getNetworkConnectionType() === "cellular";
    }

    /**
     * Checks if the network connection type is ethernet.
     * @returns {boolean} True if ethernet, false otherwise.
     */
    function isNetworkEthernet() {
        return getNetworkConnectionType() === "ethernet";
    }

    /**
     * Checks if the effective network connection type is considered slow (2G or slower).
     * @returns {boolean} True if slow, false otherwise.
     */
    function isNetworkSlow() {
        const effectiveType = getEffectiveConnectionType();
        return effectiveType === "slow-2g" || effectiveType === "2g";
    }

    /**
     * Checks if the effective network connection type is considered fast (4G).
     * @returns {boolean} True if fast, false otherwise.
     */
    function isNetworkFast() {
        return getEffectiveConnectionType() === "4g";
    }

    // --- WiFi Specific Functions (Limited browser access) ---
    // Note: Direct access to specific WiFi details like SSID or signal strength
    // is restricted in web browsers for privacy and security reasons.
    // These functions can only report general network information if it's Wi-Fi.

    /**
     * Checks if the current network connection type is WiFi.
     * Please note: This relies on navigator.connection.type which might not always
     * accurately reflect user's perceived "WiFi connection" in all environments
     * due to browser or operating system reporting limitations.
     * @returns {boolean} True if connected to WiFi (as reported by browser API), false otherwise.
     */
    function isConnectedToWiFi() {
        return getNetworkConnectionType() === "wifi";
    }

    /**
     * Placeholder for getting WiFi SSID. Direct access is not available in browsers.
     * @returns {string} A message indicating unavailability.
     */
    function getWiFiSSID() {
        return "Not available in browser";
    }

    /**
     * Placeholder for getting WiFi signal strength. Direct access is not available in browsers.
     * @returns {number} -1, indicating unavailability.
     */
    function getWiFiSignalStrength() {
        return -1; // Not available in browser
    }


    // --- Scratch Extension Definition ---
    class NetworkManagerExtension {
        constructor() {
            this.lastOnlineStatus = navigator.onLine;
            this.lastEffectiveType = getEffectiveConnectionType();

            // Set up event listeners for network changes
            if (window.addEventListener) {
                window.addEventListener('online', () => {
                    fireEvent('NETWORK_STATUS_CHANGED', { status: 'online', was: this.lastOnlineStatus, now: true });
                    this.lastOnlineStatus = true;
                });
                window.addEventListener('offline', () => {
                    fireEvent('NETWORK_STATUS_CHANGED', { status: 'offline', was: this.lastOnlineStatus, now: false });
                    this.lastOnlineStatus = false;
                });
            }

            // Listen for connection type changes if Network Information API is supported
            if (navigator.connection) {
                navigator.connection.addEventListener('change', () => {
                    const currentEffectiveType = getEffectiveConnectionType();
                    if (currentEffectiveType !== this.lastEffectiveType) {
                        fireEvent('NETWORK_TYPE_CHANGED', {
                            oldType: this.lastEffectiveType,
                            newType: currentEffectiveType
                        });
                        this.lastEffectiveType = currentEffectiveType;
                    }
                });
            }
        }

        getInfo() {
            return {
                id: 'networkmanager',
                name: 'Network Manager',
                menuIconURI: menuIcon,
                color1: mainColor,
                blocks: [
                    {
                        opcode: 'whenNetworkStatusChanges',
                        blockType: Scratch.BlockType.HAT,
                        text: 'when network status changes',
                    },
                    {
                        opcode: 'whenNetworkTypeChanges',
                        blockType: Scratch.BlockType.HAT,
                        text: 'when network type changes',
                    },
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text: '- Network Manager -'
                    },
                    {
                        opcode: 'isOnlineBlock',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'is online?',
                        disableMonitor: false,
                        blockIconURI: blockIconNetwork
                    },
                    {
                        opcode: 'getPublicIPAddressBlock',
                        blockType: Scratch.BlockType.REPORTER,
                        blockShape: Scratch.BlockShape.SQUARE, // As requested
                        text: 'get public IP address',
                        disableMonitor: false,
                        blockIconURI: blockIconNetwork
                    },
                    {
                        opcode: 'pingURLBlock',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'ping [URL] (ms)',
                        arguments: {
                            URL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'https://google.com'
                            }
                        },
                        disableMonitor: false,
                        blockIconURI: blockIconNetwork
                    },
                    {
                        opcode: 'getLastPingLatencyBlock',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'last ping latency (ms)',
                        disableMonitor: false,
                        blockIconURI: blockIconNetwork
                    },
                    {
                        opcode: 'getLastPingURLBlock',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'last ping URL',
                        disableMonitor: false,
                        blockIconURI: blockIconNetwork
                    },
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text: '- Network Report -'
                    },
                    {
                        opcode: 'getNetworkConnectionTypeBlock',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'network connection type',
                        disableMonitor: false,
                        blockIconURI: blockIconNetwork
                    },
                    {
                        opcode: 'getEffectiveConnectionTypeBlock',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'effective connection type',
                        disableMonitor: false,
                        blockIconURI: blockIconNetwork
                    },
                    {
                        opcode: 'getNetworkRTTBlock',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'network round-trip time (ms)',
                        disableMonitor: false,
                        blockIconURI: blockIconNetwork
                    },
                    {
                        opcode: 'getNetworkDownlinkBlock',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'network downlink speed (Mbps)',
                        disableMonitor: false,
                        blockIconURI: blockIconNetwork
                    },
                    {
                        opcode: 'isSaveDataModeEnabledBlock',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'is save data mode enabled?',
                        disableMonitor: false,
                        blockIconURI: blockIconNetwork
                    },
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text: '- WiFi Manager -'
                    },
                    {
                        opcode: 'isConnectedToWiFiBlock',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'is connected to WiFi?',
                        blockIconURI: blockIconWiFi
                    },
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text: '- WiFi Status -'
                    },
                    {
                        opcode: 'getWiFiSSIDBlock',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'WiFi SSID',
                        blockIconURI: blockIconWiFi
                    },
                    {
                        opcode: 'getWiFiSignalStrengthBlock',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'WiFi signal strength',
                        blockIconURI: blockIconWiFi
                    },
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text: '- Simple Network Checks -'
                    },
                    {
                        opcode: 'isNetworkCellularBlock',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'is network cellular?',
                        blockIconURI: blockIconNetwork
                    },
                    {
                        opcode: 'isNetworkEthernetBlock',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'is network ethernet?',
                        blockIconURI: blockIconNetwork
                    },
                    {
                        opcode: 'isNetworkSlowBlock',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'is network slow (2G or less)?',
                        blockIconURI: blockIconNetwork
                    },
                    {
                        opcode: 'isNetworkFastBlock',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'is network fast (4G)?',
                        blockIconURI: blockIconNetwork
                    },
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text: '- Network Website Manager -'
                    },
                    {
                        opcode: 'fetchWebsiteDataBlock',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'fetch data from [URL] with method [METHOD] body [BODY] headers [HEADERS]',
                        arguments: {
                            URL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'https://jsonplaceholder.typicode.com/posts/1'
                            },
                            METHOD: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'methodMenu',
                                defaultValue: 'GET'
                            },
                            BODY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: ''
                            },
                            HEADERS: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: '{}' // JSON string for headers, e.g., '{"Content-Type": "application/json"}'
                            }
                        },
                        blockIconURI: blockIconNetwork
                    },
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text: '- Website Fetch Data -'
                    },
                    {
                        opcode: 'getLastFetchedDataBlock',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'last fetched website data',
                        disableMonitor: false,
                        blockIconURI: blockIconNetwork
                    },
                    {
                        opcode: 'getLastStatusCodeBlock',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'last website status code',
                        disableMonitor: false,
                        blockIconURI: blockIconNetwork
                    },
                    {
                        opcode: 'getLastFetchErrorBlock',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'last website fetch error',
                        disableMonitor: false,
                        blockIconURI: blockIconNetwork
                    },
                ],
                menus: {
                    methodMenu: {
                        acceptReporters: true,
                        items: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD']
                    }
                }
            };
        }

        // --- Block Implementations ---
        isOnlineBlock() {
            return isOnline();
        }

        getPublicIPAddressBlock() {
            return getPublicIPAddress();
        }

        pingURLBlock(args) {
            return pingURL(args);
        }

        getLastPingLatencyBlock() {
            return lastPingLatency;
        }

        getLastPingURLBlock() {
            return lastPingURL;
        }

        getNetworkConnectionTypeBlock() {
            return getNetworkConnectionType();
        }

        getEffectiveConnectionTypeBlock() {
            return getEffectiveConnectionType();
        }

        getNetworkRTTBlock() {
            return getNetworkRTT();
        }

        getNetworkDownlinkBlock() {
            return getNetworkDownlink();
        }

        isSaveDataModeEnabledBlock() {
            return isSaveDataModeEnabled();
        }

        isConnectedToWiFiBlock() {
            return isConnectedToWiFi();
        }

        getWiFiSSIDBlock() {
            return getWiFiSSID();
        }

        getWiFiSignalStrengthBlock() {
            return getWiFiSignalStrength();
        }

        // New simple boolean functions
        isNetworkCellularBlock() {
            return isNetworkCellular();
        }
        isNetworkEthernetBlock() {
            return isNetworkEthernet();
        }
        isNetworkSlowBlock() {
            return isNetworkSlow();
        }
        isNetworkFastBlock() {
            return isNetworkFast();
        }

        fetchWebsiteDataBlock(args) {
            return fetchWebsiteData(args);
        }

        getLastFetchedDataBlock() {
            return getLastFetchedData();
        }

        getLastStatusCodeBlock() {
            return getLastStatusCode();
        }

        getLastFetchErrorBlock() {
            return getLastFetchError();
        }
    }

    Scratch.extensions.register(new NetworkManagerExtension());
})(Scratch);