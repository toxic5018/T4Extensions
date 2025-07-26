// Sensing V2 Extension
// Made by Toxic5018
// Follow my website: https://toxic5018.github.io/toxic5018.me/

(async function (Scratch) {
    if (!Scratch.extensions.unsandboxed) {
        alert("This extension needs to be unsandboxed for Sensing V2 functionality!");
        return;
    }

    // --- Extension Configuration ---
    const mainColor = "#5cb1d6"; // Blueish-grey
    const blockIcon = "https://github.com/toxic5018/T4Extensions/blob/main/assets/textures/block13.png?raw=true";
    const menuIcon = "https://github.com/toxic5018/T4Extensions/blob/main/assets/textures/extensions/logo/sensingv2_extension_logo.png?raw=true";

    // --- Internal State & Utilities ---
    let isMouseDown = false;
    let mouseXScratch = 0; // Mouse X coordinate in Scratch stage units (-240 to 240)
    let mouseYScratch = 0; // Mouse Y coordinate in Scratch stage units (-180 to 180)
    let lastMouseButton = 0; // Bitmask of buttons (1: left, 2: right, 4: middle)

    let activeTouches = new Map(); // Map of touchId to {clientX, clientY, scratchX, scratchY}
    let lastTouchXScratch = 0; // Last touch X coordinate in Scratch stage units
    let lastTouchYScratch = 0; // Last touch Y coordinate in Scratch stage units
    let lastTouchId = -1; // Last touch identifier

    let lastScrollDeltaY_Global = 0; // Stores the last scroll delta Y

    // Helper to emit events for Hat Blocks
    const fireEvent = (eventName, detail = {}) => {
        Scratch.vm.runtime.emit(eventName, detail);
    };

    // --- Helper Functions for Sensing ---

    /**
     * Converts browser clientX/Y coordinates to Scratch stage coordinates.
     * @param {number} clientX - Browser client X coordinate.
     * @param {number} clientY - Browser client Y coordinate.
     * @returns {{x: number, y: number}} Object with Scratch x and y coordinates.
     */
    function convertClientToScratchCoords(clientX, clientY) {
        const vmCanvas = Scratch.vm.renderer.canvas;
        const rect = vmCanvas.getBoundingClientRect();

        // Coordinates relative to Scratch canvas top-left
        const canvasX = clientX - rect.left;
        const canvasY = clientY - rect.top;

        // Scale from canvas pixels (rect.width x rect.height) to Scratch stage coordinates (480x360)
        const scratchX = (canvasX / rect.width) * Scratch.vm.runtime.stageWidth - (Scratch.vm.runtime.stageWidth / 2);
        const scratchY = (Scratch.vm.runtime.stageHeight / 2) - (canvasY / rect.height) * Scratch.vm.runtime.stageHeight;

        return { x: scratchX, y: scratchY };
    }

    /**
     * Converts a hex color string (e.g., "#FF0000") to an RGB array [R, G, B].
     * @param {string} hex - The hex color string.
     * @returns {Array<number>} An array containing the R, G, and B values.
     */
    function hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    }

    /**
     * Detects device orientation.
     * @returns {string} "portrait", "landscape", or falls back to "landscape"/"portrait" based on window dimensions.
     */
    function getDeviceOrientation() {
        if (window.screen.orientation && window.screen.orientation.type) {
            if (window.screen.orientation.type.startsWith("landscape")) {
                return "landscape";
            } else if (window.screen.orientation.type.startsWith("portrait")) {
                return "portrait";
            }
        }
        // Fallback for older browsers or if orientation API is not available
        if (window.innerWidth > window.innerHeight) {
            return "landscape";
        } else {
            return "portrait";
        }
    }

    /**
     * Gathers information about the user agent (OS, browser, device type).
     * @returns {{os: string, browser: string, device: string}} Object containing detected info.
     */
    function getUserAgentInfo() {
        const ua = navigator.userAgent;
        let os = "Unknown OS";
        let browser = "Unknown Browser";
        let device = "Unknown Device";

        if (/Mobi|Android|iPhone|iPad|iPod|BlackBerry|Opera Mini|IEMobile|WPDesktop/i.test(ua)) {
            device = "Mobile";
        } else if (/CrOS/i.test(ua) || /Macintosh|Mac OS X/i.test(ua) || /Windows|Win32/i.test(ua) || /Linux/i.test(ua)) {
            device = "Desktop";
        }

        if (/Windows NT/.test(ua)) os = "Windows";
        else if (/Mac OS X/.test(ua)) os = "macOS";
        else if (/Linux/.test(ua)) os = "Linux";
        else if (/Android/.test(ua)) os = "Android";
        else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
        else if (/CrOS/.test(ua)) os = "Chrome OS";

        if (/Chrome/.test(ua) && !/Edge|OPR|Brave|Viv|HeadlessChrome/.test(ua)) browser = "Chrome";
        else if (/Firefox/.test(ua)) browser = "Firefox";
        else if (/Safari/.test(ua) && !/Chrome|Edge/.test(ua)) browser = "Safari";
        else if (/Edge/.test(ua)) browser = "Edge";
        else if (/Opera|OPR/.test(ua)) browser = "Opera";
        else if (/Brave/.test(ua)) browser = "Brave";
        else if (/MSIE|Trident/.test(ua)) browser = "Internet Explorer";
        else if (/SamsungBrowser/.test(ua)) browser = "Samsung Browser";

        return { os, browser, device };
    }

    /**
     * Checks if the browser is currently in fullscreen mode.
     * @returns {boolean} True if in fullscreen, false otherwise.
     */
    function isFullscreen() {
        return document.fullscreenElement !== null;
    }

    /**
     * Detects if the device has a touch screen.
     * @returns {boolean} True if touch screen detected, false otherwise.
     */
    function isTouchScreenDevice() {
        return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    }

    /**
     * Calculates the greatest common divisor for two numbers.
     * Used for aspect ratio calculation.
     * @param {number} a
     * @param {number} b
     * @returns {number} GCD of a and b.
     */
    function gcd(a, b) {
        return (b === 0 ? a : gcd(b, a % b));
    }


    // --- Event Handlers ---
    document.addEventListener('mousedown', (e) => {
        isMouseDown = true;
        const { x, y } = convertClientToScratchCoords(e.clientX, e.clientY);
        mouseXScratch = x;
        mouseYScratch = y;
        lastMouseButton = e.buttons;
    });

    document.addEventListener('mouseup', (e) => {
        isMouseDown = false;
        const { x, y } = convertClientToScratchCoords(e.clientX, e.clientY);
        mouseXScratch = x;
        mouseYScratch = y;
        lastMouseButton = e.buttons;
    });

    document.addEventListener('mousemove', (e) => {
        const { x, y } = convertClientToScratchCoords(e.clientX, e.clientY);
        mouseXScratch = x;
        mouseYScratch = y;
    });

    document.addEventListener('touchstart', (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const { x, y } = convertClientToScratchCoords(touch.clientX, touch.clientY);
            activeTouches.set(touch.identifier, { clientX: touch.clientX, clientY: touch.clientY, scratchX: x, scratchY: y });
            lastTouchXScratch = x;
            lastTouchYScratch = y;
            lastTouchId = touch.identifier;
        }

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            fireEvent('FINGER_DOWN', { x: lastTouchXScratch, y: lastTouchYScratch, id: touch.identifier });

            // Emit for the new general 'when [TARGET] touched' block
            fireEvent('GENERAL_TOUCHED', { targetName: 'mouse-pointer' }); // Mouse pointer conceptually touched on any touch
            
            // Check if touch is on edge for 'GENERAL_TOUCHED'
            const vmCanvas = Scratch.vm.renderer.canvas;
            const rect = vmCanvas.getBoundingClientRect();
            if (touch.clientX <= rect.left || touch.clientX >= rect.right || touch.clientY <= rect.top || touch.clientY >= rect.bottom) {
                fireEvent('GENERAL_TOUCHED', { targetName: 'edge' });
            }
            
            const targets = Scratch.vm.runtime.targets.filter(t => !t.isStage);
            let touchedOnSprite = false;
            for (const target of targets) {
                const drawableID = Scratch.vm.runtime.renderer.pick(touch.clientX, touch.clientY);
                if (drawableID !== null) {
                    const pickedTarget = Scratch.vm.runtime.renderer.getRenderedTargetForDrawable(drawableID);
                    if (pickedTarget && pickedTarget.id === target.id) {
                        fireEvent('SPRITE_TOUCHED', { spriteName: target.sprite.name });
                        touchedOnSprite = true;
                        break;
                    }
                }
            }
            if (!touchedOnSprite) {
                fireEvent('STAGE_TOUCHED');
            }
        }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            activeTouches.delete(touch.identifier);
        }

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const { x, y } = convertClientToScratchCoords(touch.clientX, touch.clientY);
            fireEvent('FINGER_UP', { x: x, y: y, id: touch.identifier });
        }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (activeTouches.has(touch.identifier)) {
                const { x, y } = convertClientToScratchCoords(touch.clientX, touch.clientY);
                activeTouches.set(touch.identifier, { clientX: touch.clientX, clientY: touch.clientY, scratchX: x, scratchY: y });
                lastTouchXScratch = x;
                lastTouchYScratch = y;
                lastTouchId = touch.identifier;
            }
        }
    }, { passive: true });

    document.addEventListener('wheel', (e) => {
        lastScrollDeltaY_Global = e.deltaY;
    });


    // --- Scratch Extension Definition ---
    class SensingV2Extension {
        constructor() {
            // No drag related event listeners needed anymore.
        }

        getInfo() {
            return {
                id: 'sensingv2',
                name: 'Sensing V2',
                menuIconURI: menuIcon,
                color1: mainColor,
                blocks: [
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text: '- Touch Detection -'
                    },
                    {
                        opcode: 'whenStageTouched',
                        blockType: Scratch.BlockType.HAT,
                        text: 'when stage touched',
                        blockIconURI: blockIcon
                    },
                    { // General "when touched" block
                        opcode: 'whenGeneralTouched',
                        blockType: Scratch.BlockType.HAT,
                        text: 'when [TOUCH_TARGET] touched',
                        arguments: {
                            TOUCH_TARGET: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'touchTargetMenu'
                            }
                        },
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'isTouchingTarget',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'touching [TARGET_NAME]?',
                        arguments: {
                            TARGET_NAME: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'touchTargetMenu'
                            }
                        },
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'touchX',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'touch x',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'touchY',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'touch y',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'numberOfTouches',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'number of touches',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'touchId',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'last touch id',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'getTouchXById',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'touch x of id [TOUCH_ID]',
                        arguments: {
                            TOUCH_ID: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            }
                        },
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'getTouchYById',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'touch y of id [TOUCH_ID]',
                        arguments: {
                            TOUCH_ID: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            }
                        },
                        blockIconURI: blockIcon
                    },
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text: '- Touch Clone Detection -'
                    },
                    {
                        opcode: 'isTouchingCloneOfSprite',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'touching clone of [SPRITE_NAME]?',
                        arguments: {
                            SPRITE_NAME: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'originalSpritesMenu'
                            }
                        },
                        blockIconURI: blockIcon
                    },
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text: '- Mouse Detection -'
                    },
                    {
                        opcode: 'whenMouseClicked',
                        blockType: Scratch.BlockType.HAT,
                        text: 'when mouse clicked',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'isMouseDown',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'mouse down?',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'mouseX',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'mouse x',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'mouseY',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'mouse y',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'isMouseButtonPressed',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'mouse button [BUTTON] pressed?',
                        arguments: {
                            BUTTON: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'mouseButtonMenu'
                            }
                        },
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'isMouseScrollingUp',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'is mouse scrolling up?',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'isMouseScrollingDown',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'is mouse scrolling down?',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'lastScrollDeltaY',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'last scroll delta Y',
                        blockIconURI: blockIcon
                    },
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text: '- Finger Detection -'
                    },
                    {
                        opcode: 'whenFingerDown',
                        blockType: Scratch.BlockType.HAT,
                        text: 'when finger down',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'whenFingerUp',
                        blockType: Scratch.BlockType.HAT,
                        text: 'when finger up',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'isFingerCountDown',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'is [NUMBER_OF_FINGERS] finger(s) down?',
                        arguments: {
                            NUMBER_OF_FINGERS: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'fingerCountDropdown',
                                defaultValue: '1'
                            }
                        },
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'isAnyFingerDown',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'is any finger down?',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'fingerCount',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'finger count',
                        blockIconURI: blockIcon
                    },
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text: '- Stage Properties -'
                    },
                    {
                        opcode: 'stageWidth',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'stage width',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'stageHeight',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'stage height',
                        blockIconURI: blockIcon
                    },
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text: '- Color Sensing -'
                    },
                    {
                        opcode: 'isTouchingColor',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'touching color [COLOR_INPUT]?',
                        arguments: {
                            COLOR_INPUT: {
                                type: Scratch.ArgumentType.COLOR,
                                defaultValue: '#FF0000'
                            }
                        },
                        blockIconURI: blockIcon
                    },
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text: '- Device Detection -'
                    },
                    {
                        opcode: 'isMobileDevice',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'is mobile device?',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'isDesktopDevice',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'is desktop device?',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'isTouchScreenDevice',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'is touch screen device?',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'deviceOrientation',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'device orientation',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'deviceWidth',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'device width (px)',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'deviceHeight',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'device height (px)',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'pixelRatio',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'pixel ratio',
                        blockIconURI: blockIcon,
                        blockShape: Scratch.BlockShape.SQUARE
                    },
                    {
                        opcode: 'screenAspectRatio',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'screen aspect ratio',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'browserName',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'browser name',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'osName',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'operating system name',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'isFullscreen',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'is in fullscreen?',
                        blockIconURI: blockIcon
                    }
                ],
                menus: {
                    mouseButtonMenu: {
                        acceptReporters: true,
                        items: ['primary', 'middle', 'secondary']
                    },
                    touchTargetMenu: {
                        acceptReporters: true,
                        items: '_getTouchTargetMenuItems'
                    },
                    fingerCountDropdown: {
                        acceptReporters: false,
                        items: ['1', '2', '3', '4', '5']
                    },
                    originalSpritesMenu: {
                        acceptReporters: true,
                        items: '_getOriginalSpriteNames'
                    }
                }
            };
        }

        // --- Menu Getters ---
        _getTouchTargetMenuItems() {
            const items = ['mouse-pointer', 'edge'];
            const spriteNames = Scratch.vm.runtime.targets
                .filter(target => !target.isStage && target.isOriginal)
                .map(target => target.sprite.name)
                .filter((value, index, self) => self.indexOf(value) === index);
            return [...items, ...spriteNames];
        }

        _getOriginalSpriteNames() {
            return Scratch.vm.runtime.targets
                .filter(target => !target.isStage && target.isOriginal)
                .map(target => target.sprite.name)
                .filter((value, index, self) => self.indexOf(value) === index);
        }


        // --- Block Implementations ---

        // Touch Detection
        whenStageTouched() { /* Event emitted by touchstart handler */ }
        whenGeneralTouched(args) {
            // This hat block will be triggered by the 'GENERAL_TOUCHED' event
            // which is emitted from the touchstart/mousedown handlers.
            // The VM's hat block logic will handle matching the targetName from the event detail.
            // No direct implementation needed here, as the event system handles it.
        }

        isTouchingTarget(args) {
            const targetName = args.TARGET_NAME;

            if (targetName === 'mouse-pointer') {
                return isMouseDown || activeTouches.size > 0;
            }
            if (targetName === 'edge') {
                const vmCanvas = Scratch.vm.renderer.canvas;
                const rect = vmCanvas.getBoundingClientRect();

                // Check mouse position against edge
                const mouseClientX = rect.left + (mouseXScratch + 240) * rect.width / 480;
                const mouseClientY = rect.top + (180 - mouseYScratch) * rect.height / 360;
                if (isMouseDown && (mouseClientX <= rect.left || mouseClientX >= rect.right || mouseClientY <= rect.top || mouseClientY >= rect.bottom)) {
                    return true;
                }

                // Check touch positions against edge
                for (const touch of activeTouches.values()) {
                    if (touch.clientX <= rect.left || touch.clientX >= rect.right || touch.clientY <= rect.top || touch.clientY >= rect.bottom) {
                        return true;
                    }
                }
                return false;
            }

            // --- Sprite collision using renderer.pick for pixel-perfect detection ---

            // Check mouse collision with targetName
            if (isMouseDown) {
                const vmCanvas = Scratch.vm.renderer.canvas;
                const rect = vmCanvas.getBoundingClientRect();
                const mouseClientX = rect.left + (mouseXScratch + 240) * rect.width / 480;
                const mouseClientY = rect.top + (180 - mouseYScratch) * rect.height / 360;

                const drawableID = Scratch.vm.runtime.renderer.pick(mouseClientX, mouseClientY);
                if (drawableID !== null) {
                    const pickedTarget = Scratch.vm.runtime.renderer.getRenderedTargetForDrawable(drawableID); // Corrected function call
                    if (pickedTarget && pickedTarget.sprite.name === targetName) {
                        return true;
                    }
                }
            }

            // Check touch collision with targetName
            for (const touch of activeTouches.values()) {
                const drawableID = Scratch.vm.runtime.renderer.pick(touch.clientX, touch.clientY);
                if (drawableID !== null) {
                    const pickedTarget = Scratch.vm.runtime.renderer.getRenderedTargetForDrawable(drawableID); // Corrected function call
                    if (pickedTarget && pickedTarget.sprite.name === targetName) {
                        return true;
                    }
                }
            }
            return false;
        }

        touchX() { return lastTouchXScratch; }
        touchY() { return lastTouchYScratch; }
        numberOfTouches() { return activeTouches.size; }
        touchId() { return lastTouchId; }

        getTouchXById(args) {
            const touch = activeTouches.get(args.TOUCH_ID);
            return touch ? touch.scratchX : 0;
        }
        getTouchYById(args) {
            const touch = activeTouches.get(args.TOUCH_ID);
            return touch ? touch.scratchY : 0;
        }

        // Touch Clone Detection
        isTouchingCloneOfSprite(args) {
            const spriteName = args.SPRITE_NAME;

            // Helper to check if a picked target is a clone of the desired sprite
            const checkPickedTargetForClone = (drawableID) => {
                if (drawableID === null) return false;
                const pickedTarget = Scratch.vm.runtime.renderer.getRenderedTargetForDrawable(drawableID); // Corrected function call
                // Check if it's a target, it's a clone, and its original sprite name matches
                return pickedTarget && pickedTarget.isClone && pickedTarget.sprite.name === spriteName;
            };

            // Check mouse collision
            if (isMouseDown) {
                const vmCanvas = Scratch.vm.renderer.canvas;
                const rect = vmCanvas.getBoundingClientRect();
                const mouseClientX = rect.left + (mouseXScratch + 240) * rect.width / 480;
                const mouseClientY = rect.top + (180 - mouseYScratch) * rect.height / 360;
                if (checkPickedTargetForClone(Scratch.vm.runtime.renderer.pick(mouseClientX, mouseClientY))) {
                    return true;
                }
            }

            // Check touch collision
            for (const touch of activeTouches.values()) {
                if (checkPickedTargetForClone(Scratch.vm.runtime.renderer.pick(touch.clientX, touch.clientY))) {
                    return true;
                }
            }
            return false;
        }

        // Mouse Detection
        whenMouseClicked() { /* Event emitted by click handler */ }
        isMouseDown() { return isMouseDown; }
        mouseX() { return mouseXScratch; }
        mouseY() { return mouseYScratch; }
        isMouseButtonPressed(args) {
            const button = args.BUTTON;
            // The `buttons` property is a bitmask: 1=primary/left, 2=secondary/right, 4=middle
            if (button === 'primary') return (lastMouseButton & 1) !== 0;
            if (button === 'secondary') return (lastMouseButton & 2) !== 0;
            if (button === 'middle') return (lastMouseButton & 4) !== 0;
            return false;
        }
        isMouseScrollingUp() { return lastScrollDeltaY_Global < 0; }
        isMouseScrollingDown() { return lastScrollDeltaY_Global > 0; }
        lastScrollDeltaY() { return lastScrollDeltaY_Global; }

        // Finger Detection
        whenFingerDown() { /* Event emitted by touchstart handler */ }
        whenFingerUp() { /* Event emitted by touchend handler */ }
        isFingerCountDown(args) {
            const count = parseInt(args.NUMBER_OF_FINGERS, 10);
            return activeTouches.size >= count;
        }
        isAnyFingerDown() { return activeTouches.size > 0; }
        fingerCount() { return activeTouches.size; }

        // Stage Properties
        stageWidth() {
            return Scratch.vm.runtime.stageWidth;
        }
        stageHeight() {
            return Scratch.vm.runtime.stageHeight;
        }

        // Color Sensing
        isTouchingColor(args) {
            const targetRgb = hexToRgb(args.COLOR_INPUT);

            // Check mouse touching color
            if (isMouseDown) {
                const extractedColor = Scratch.vm.runtime.renderer.extractColor(mouseXScratch, mouseYScratch, 1, 1);
                if (extractedColor && extractedColor.length >= 3 &&
                    extractedColor[0] === targetRgb[0] &&
                    extractedColor[1] === targetRgb[1] &&
                    extractedColor[2] === targetRgb[2]) {
                    return true;
                }
            }

            // Check touch touching color
            for (const touch of activeTouches.values()) {
                const extractedColor = Scratch.vm.runtime.renderer.extractColor(touch.scratchX, touch.scratchY, 1, 1);
                if (extractedColor && extractedColor.length >= 3 &&
                    extractedColor[0] === targetRgb[0] &&
                    extractedColor[1] === targetRgb[1] &&
                    extractedColor[2] === targetRgb[2]) {
                    return true;
                }
            }
            return false;
        }

        // Device Detection
        isMobileDevice() { return getUserAgentInfo().device === "Mobile"; }
        isDesktopDevice() { return getUserAgentInfo().device === "Desktop"; }
        isTouchScreenDevice() { return isTouchScreenDevice(); }
        deviceOrientation() { return getDeviceOrientation(); }
        deviceWidth() { return window.innerWidth; }
        deviceHeight() { return window.innerHeight; }
        pixelRatio() { return window.devicePixelRatio || 1; }
        screenAspectRatio() {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const commonDivisor = gcd(width, height);
            return `${width / commonDivisor}:${height / commonDivisor}`;
        }
        browserName() { return getUserAgentInfo().browser; }
        osName() { return getUserAgentInfo().os; }
        isFullscreen() { return isFullscreen(); }
    }

    Scratch.extensions.register(new SensingV2Extension());
})(Scratch);