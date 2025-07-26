// TimerPlus Extension
// Made by Toxic5018
// Follow my website: https://toxic5018.github.io/toxic5018.me/

(async function (Scratch) {
    if (!Scratch.extensions.unsandboxed) {
        alert("This extension needs to be unsandboxed for full TimerPlus functionality!");
        return;
    }

    // --- Internal State Variables for Custom Timer ---
    let _customTimerStartTime = 0; // Milliseconds since epoch
    let _customTimerRunning = false;
    let _customTimerElapsedTimeOnStop = 0; // Stores elapsed time when stopped, in milliseconds

    // --- Utility Functions ---
    const MS_PER_SECOND = 1000;
    const MS_PER_MINUTE = 60 * MS_PER_SECOND;
    const MS_PER_HOUR = 60 * MS_PER_MINUTE;
    const MS_PER_DAY = 24 * MS_PER_HOUR;

    const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    // Helper to parse potential string inputs to numbers (e.g., from Scratch blocks)
    function parseNumber(value) {
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    }

    // --- Timer Blocks Functions ---

    function startCustomTimer() {
        _customTimerStartTime = Date.now();
        _customTimerRunning = true;
        _customTimerElapsedTimeOnStop = 0; // Reset any previously stopped time
    }

    function stopCustomTimer() {
        if (_customTimerRunning) {
            _customTimerElapsedTimeOnStop = Date.now() - _customTimerStartTime;
            _customTimerRunning = false;
        }
    }

    function resetCustomTimer() {
        _customTimerStartTime = 0;
        _customTimerRunning = false;
        _customTimerElapsedTimeOnStop = 0;
    }

    function getCustomTimerValue() {
        if (_customTimerRunning) {
            return (Date.now() - _customTimerStartTime) / MS_PER_SECOND; // Return in seconds
        }
        return _customTimerElapsedTimeOnStop / MS_PER_SECOND; // Return in seconds
    }

    function isCustomTimerRunning() {
        return _customTimerRunning;
    }

    // --- Timer Info Blocks Functions ---

    function getCurrentUnixTimestamp() {
        return Math.floor(Date.now() / MS_PER_SECOND); // Seconds since Jan 1, 1970 UTC
    }

    function getCurrentMilliseconds() {
        return Date.now(); // Milliseconds since Jan 1, 1970 UTC
    }

    function getCurrentTimeComponent(args) {
        const date = new Date();
        switch (args.COMPONENT) {
            case 'year': return date.getFullYear();
            case 'month': return date.getMonth() + 1; // 1-12
            case 'day': return date.getDate();
            case 'hour': return date.getHours();
            case 'minute': return date.getMinutes();
            case 'second': return date.getSeconds();
            default: return 0;
        }
    }

    function getCurrentDayOfWeek() {
        return DAY_NAMES[new Date().getDay()]; // Returns name, e.g., "Monday"
    }

    function getCurrentMonthName() {
        return MONTH_NAMES[new Date().getMonth()]; // Returns name, e.g., "January"
    }

    function getDaysSince2000() {
        const date2000 = new Date('2000-01-01T00:00:00Z'); // UTC
        const now = new Date();
        const diffMs = now.getTime() - date2000.getTime();
        return Math.floor(diffMs / MS_PER_DAY);
    }

    function getTimestampAsDateString(args) {
        const timestampMs = parseNumber(args.TIMESTAMP) * MS_PER_SECOND; // Convert seconds to milliseconds
        const date = new Date(timestampMs);
        if (isNaN(date.getTime())) return ""; // Check for invalid date
        return date.toLocaleDateString(); // Default locale format
    }

    function getTimestampAsTimeString(args) {
        const timestampMs = parseNumber(args.TIMESTAMP) * MS_PER_SECOND; // Convert seconds to milliseconds
        const date = new Date(timestampMs);
        if (isNaN(date.getTime())) return ""; // Check for invalid date
        return date.toLocaleTimeString(); // Default locale format
    }

    // --- Time Calculation Blocks Functions ---

    function getTimeDifference(args) {
        const ts1Ms = parseNumber(args.TIMESTAMP1) * MS_PER_SECOND;
        const ts2Ms = parseNumber(args.TIMESTAMP2) * MS_PER_SECOND;
        const diffMs = Math.abs(ts2Ms - ts1Ms); // Absolute difference

        switch (args.UNIT) {
            case 'seconds': return diffMs / MS_PER_SECOND;
            case 'minutes': return diffMs / MS_PER_MINUTE;
            case 'hours': return diffMs / MS_PER_HOUR;
            case 'days': return diffMs / MS_PER_DAY;
            default: return 0;
        }
    }

    function addTimeToTimestamp(args) {
        const timestampMs = parseNumber(args.TIMESTAMP) * MS_PER_SECOND;
        const value = parseNumber(args.VALUE);
        let addedMs = 0;

        switch (args.UNIT) {
            case 'seconds': addedMs = value * MS_PER_SECOND; break;
            case 'minutes': addedMs = value * MS_PER_MINUTE; break;
            case 'hours': addedMs = value * MS_PER_HOUR; break;
            case 'days': addedMs = value * MS_PER_DAY; break;
            default: addedMs = 0;
        }
        return Math.floor((timestampMs + addedMs) / MS_PER_SECOND); // Return new timestamp in seconds
    }

    function convertTimeUnits(args) {
        const value = parseNumber(args.VALUE);
        if (args.FROM_UNIT === args.TO_UNIT) return value; // No conversion needed

        let valueInMs;
        switch (args.FROM_UNIT) {
            case 'seconds': valueInMs = value * MS_PER_SECOND; break;
            case 'minutes': valueInMs = value * MS_PER_MINUTE; break;
            case 'hours': valueInMs = value * MS_PER_HOUR; break;
            case 'days': valueInMs = value * MS_PER_DAY; break;
            default: return 0;
        }

        switch (args.TO_UNIT) {
            case 'seconds': return valueInMs / MS_PER_SECOND;
            case 'minutes': return valueInMs / MS_PER_MINUTE;
            case 'hours': return valueInMs / MS_PER_HOUR;
            case 'days': return valueInMs / MS_PER_DAY;
            default: return 0;
        }
    }

    function isTimestampBefore(args) {
        const ts1Ms = parseNumber(args.TIMESTAMP1) * MS_PER_SECOND;
        const ts2Ms = parseNumber(args.TIMESTAMP2) * MS_PER_SECOND;
        return ts1Ms < ts2Ms;
    }

    function isTimestampAfter(args) {
        const ts1Ms = parseNumber(args.TIMESTAMP1) * MS_PER_SECOND;
        const ts2Ms = parseNumber(args.TIMESTAMP2) * MS_PER_SECOND;
        return ts1Ms > ts2Ms;
    }

    function isSameDay(args) {
        const date1 = new Date(parseNumber(args.TIMESTAMP1) * MS_PER_SECOND);
        const date2 = new Date(parseNumber(args.TIMESTAMP2) * MS_PER_SECOND);

        if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return false;

        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    function daysUntilDate(args) {
        const targetDate = new Date(
            parseNumber(args.YEAR),
            parseNumber(args.MONTH) - 1, // Month is 0-indexed
            parseNumber(args.DAY),
            parseNumber(args.HOUR),
            parseNumber(args.MINUTE),
            parseNumber(args.SECOND),
            parseNumber(args.MILLISECOND)
        );
        const now = new Date();
        const diffMs = targetDate.getTime() - now.getTime();
        return Math.ceil(diffMs / MS_PER_DAY); // Ceil to count partial days until
    }

    function daysAfterDate(args) {
        const targetDate = new Date(
            parseNumber(args.YEAR),
            parseNumber(args.MONTH) - 1, // Month is 0-indexed
            parseNumber(args.DAY),
            parseNumber(args.HOUR),
            parseNumber(args.MINUTE),
            parseNumber(args.SECOND),
            parseNumber(args.MILLISECOND)
        );
        const now = new Date();
        const diffMs = now.getTime() - targetDate.getTime();
        return Math.floor(diffMs / MS_PER_DAY); // Floor to count full days after
    }

    function isSpecificDateToday(args) {
        const targetDate = new Date(
            parseNumber(args.YEAR),
            parseNumber(args.MONTH) - 1, // Month is 0-indexed
            parseNumber(args.DAY),
            parseNumber(args.HOUR),
            parseNumber(args.MINUTE),
            parseNumber(args.SECOND),
            parseNumber(args.MILLISECOND)
        );
        const today = new Date();

        if (isNaN(targetDate.getTime())) return false;

        return targetDate.getFullYear() === today.getFullYear() &&
               targetDate.getMonth() === today.getMonth() &&
               targetDate.getDate() === today.getDate();
    }

    function convertMillisecondsToUnit(args) {
        const milliseconds = parseNumber(args.MILLISECONDS);
        switch (args.TO_UNIT) {
            case 'millisecond': return milliseconds;
            case 'second': return milliseconds / MS_PER_SECOND;
            case 'minute': return milliseconds / MS_PER_MINUTE;
            case 'hour': return milliseconds / MS_PER_HOUR;
            case 'day': return milliseconds / MS_PER_DAY;
            default: return 0;
        }
    }


    // --- Extension Definition ---
    class TimerPlusExtension {
        constructor(runtime) {
            this.runtime = runtime;
        }

        getInfo() {
            const blockIcon6 = "https://github.com/toxic5018/T4Extensions/blob/main/assets/textures/block6.png?raw=true";
            const lightBlue = "#00b3d8"; // Main light blue color
            const darkerBlue = "#0090af"; // Slightly darker shade for secondary

            return {
                id: "toxic5018TimerPlus",
                name: "TimerPlus",
                color1: lightBlue,
                color2: darkerBlue,
                menuIconURI: "https://github.com/toxic5018/T4Extensions/blob/main/assets/textures/extensions/logo/timerplus_extension_logo.png?raw=true",
                blockIconURI: blockIcon6,
                blocks: [
                    {
                        opcode: "extensionVersion",
                        blockType: Scratch.BlockType.LABEL,
                        text: "Version 1.0",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                    "---",
                    {
                        opcode: "labelTimer",
                        blockType: Scratch.BlockType.LABEL,
                        text: "-- Timer --",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                    {
                        opcode: "startCustomTimer",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "start custom timer",
                        func: "startCustomTimer",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                    {
                        opcode: "stopCustomTimer",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "stop custom timer",
                        func: "stopCustomTimer",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                    {
                        opcode: "resetCustomTimer",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "reset custom timer",
                        func: "resetCustomTimer",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                    {
                        opcode: "getCustomTimerValue",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "custom timer (seconds)",
                        func: "getCustomTimerValue",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                    {
                        opcode: "isCustomTimerRunning",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "is custom timer running?",
                        func: "isCustomTimerRunning",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                    "---",
                    {
                        opcode: "labelTimerInfo",
                        blockType: Scratch.BlockType.LABEL,
                        text: "-- Timer Info --",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                    {
                        opcode: "getCurrentUnixTimestamp",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "current Unix timestamp (seconds)",
                        func: "getCurrentUnixTimestamp",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                    {
                        opcode: "getCurrentMilliseconds",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "current milliseconds (since epoch)",
                        func: "getCurrentMilliseconds",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                    {
                        opcode: "getCurrentTimeComponent",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "current [COMPONENT]",
                        arguments: {
                            COMPONENT: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "current_time_components",
                                defaultValue: "year",
                            },
                        },
                        func: "getCurrentTimeComponent",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                    {
                        opcode: "getCurrentDayOfWeek",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "current day of week",
                        func: "getCurrentDayOfWeek",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                    {
                        opcode: "getCurrentMonthName",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "current month name",
                        func: "getCurrentMonthName",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                    {
                        opcode: "getDaysSince2000",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "days since January 1, 2000",
                        func: "getDaysSince2000",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                    {
                        opcode: "getTimestampAsDateString",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "date string from timestamp [TIMESTAMP]",
                        arguments: {
                            TIMESTAMP: { type: Scratch.ArgumentType.NUMBER, defaultValue: Date.now() / 1000 },
                        },
                        func: "getTimestampAsDateString",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                    {
                        opcode: "getTimestampAsTimeString",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "time string from timestamp [TIMESTAMP]",
                        arguments: {
                            TIMESTAMP: { type: Scratch.ArgumentType.NUMBER, defaultValue: Date.now() / 1000 },
                        },
                        func: "getTimestampAsTimeString",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                    "---",
                    {
                        opcode: "labelTimeCalculation",
                        blockType: Scratch.BlockType.LABEL,
                        text: "-- Time Calculation --",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                    {
                        opcode: "getTimeDifference",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "difference between [TIMESTAMP1] and [TIMESTAMP2] in [UNIT]",
                        arguments: {
                            TIMESTAMP1: { type: Scratch.ArgumentType.NUMBER, defaultValue: Date.now() / 1000 },
                            TIMESTAMP2: { type: Scratch.ArgumentType.NUMBER, defaultValue: (Date.now() / 1000) + 3600 }, // 1 hour later
                            UNIT: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "time_units_short",
                                defaultValue: "seconds",
                            },
                        },
                        func: "getTimeDifference",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                    {
                        opcode: "addTimeToTimestamp",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "add [VALUE] [UNIT] to timestamp [TIMESTAMP]",
                        arguments: {
                            VALUE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
                            UNIT: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "time_units_short",
                                defaultValue: "hours",
                            },
                            TIMESTAMP: { type: Scratch.ArgumentType.NUMBER, defaultValue: Date.now() / 1000 },
                        },
                        func: "addTimeToTimestamp",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                    {
                        opcode: "convertTimeUnits",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "convert [VALUE] [FROM_UNIT] to [TO_UNIT]",
                        arguments: {
                            VALUE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 60 },
                            FROM_UNIT: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "time_units_long",
                                defaultValue: "minutes",
                            },
                            TO_UNIT: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "time_units_long",
                                defaultValue: "seconds",
                            },
                        },
                        func: "convertTimeUnits",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                    {
                        opcode: "convertMillisecondsToUnit",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "convert [MILLISECONDS] milliseconds to [TO_UNIT]",
                        arguments: {
                            MILLISECONDS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1000 },
                            TO_UNIT: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "milliseconds_conversion_units",
                                defaultValue: "second",
                            },
                        },
                        func: "convertMillisecondsToUnit",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                     "---",
                    {
                        opcode: "labelTimeCalculationInfo",
                        blockType: Scratch.BlockType.LABEL,
                        text: "-- Time Calculation Info --",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                    {
                        opcode: "daysUntilDate",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "days until year [YEAR] month [MONTH] day [DAY] hour [HOUR] minute [MINUTE] second [SECOND] millisecond [MILLISECOND]",
                        arguments: {
                            YEAR: { type: Scratch.ArgumentType.NUMBER, defaultValue: new Date().getFullYear() + 1 },
                            MONTH: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
                            DAY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
                            HOUR: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            MINUTE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            SECOND: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            MILLISECOND: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                        },
                        func: "daysUntilDate",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                    {
                        opcode: "daysAfterDate",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "days after year [YEAR] month [MONTH] day [DAY] hour [HOUR] minute [MINUTE] second [SECOND] millisecond [MILLISECOND]",
                        arguments: {
                            YEAR: { type: Scratch.ArgumentType.NUMBER, defaultValue: new Date().getFullYear() - 1 },
                            MONTH: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
                            DAY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
                            HOUR: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            MINUTE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            SECOND: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            MILLISECOND: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                        },
                        func: "daysAfterDate",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                    {
                        opcode: "isSpecificDateToday",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "is year [YEAR] month [MONTH] day [DAY] today?",
                        arguments: {
                            YEAR: { type: Scratch.ArgumentType.NUMBER, defaultValue: new Date().getFullYear() },
                            MONTH: { type: Scratch.ArgumentType.NUMBER, defaultValue: new Date().getMonth() + 1 },
                            DAY: { type: Scratch.ArgumentType.NUMBER, defaultValue: new Date().getDate() },
                            HOUR: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }, // Not used for comparison, but kept for consistency
                            MINUTE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }, // Not used for comparison, but kept for consistency
                            SECOND: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }, // Not used for comparison, but kept for consistency
                            MILLISECOND: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }, // Not used for comparison, but kept for consistency
                        },
                        func: "isSpecificDateToday",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                    {
                        opcode: "isTimestampBefore",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "timestamp [TIMESTAMP1] is before [TIMESTAMP2]?",
                        arguments: {
                            TIMESTAMP1: { type: Scratch.ArgumentType.NUMBER, defaultValue: Date.now() / 1000 },
                            TIMESTAMP2: { type: Scratch.ArgumentType.NUMBER, defaultValue: (Date.now() / 1000) + 60 },
                        },
                        func: "isTimestampBefore",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                    {
                        opcode: "isTimestampAfter",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "timestamp [TIMESTAMP1] is after [TIMESTAMP2]?",
                        arguments: {
                            TIMESTAMP1: { type: Scratch.ArgumentType.NUMBER, defaultValue: Date.now() / 1000 },
                            TIMESTAMP2: { type: Scratch.ArgumentType.NUMBER, defaultValue: (Date.now() / 1000) - 60 },
                        },
                        func: "isTimestampAfter",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                     {
                        opcode: "isSameDay",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "timestamp [TIMESTAMP1] is same day as [TIMESTAMP2]?",
                        arguments: {
                            TIMESTAMP1: { type: Scratch.ArgumentType.NUMBER, defaultValue: Date.now() / 1000 },
                            TIMESTAMP2: { type: Scratch.ArgumentType.NUMBER, defaultValue: Date.now() / 1000 },
                        },
                        func: "isSameDay",
                        blockIconURI: blockIcon6,
                        color1: lightBlue,
                        color2: darkerBlue,
                    },
                ],
                menus: {
                    current_time_components: {
                        acceptReporters: true,
                        items: ["year", "month", "day", "hour", "minute", "second"],
                    },
                    time_units_short: {
                        acceptReporters: true,
                        items: ["seconds", "minutes", "hours", "days"],
                    },
                    time_units_long: {
                        acceptReporters: true,
                        items: ["seconds", "minutes", "hours", "days"],
                    },
                    milliseconds_conversion_units: {
                        acceptReporters: true,
                        items: ["millisecond", "second", "minute", "hour", "day"],
                    },
                },
            };
        }

        // --- Timer Functions ---
        startCustomTimer() { return startCustomTimer(); }
        stopCustomTimer() { return stopCustomTimer(); }
        resetCustomTimer() { return resetCustomTimer(); }
        getCustomTimerValue() { return getCustomTimerValue(); }
        isCustomTimerRunning() { return isCustomTimerRunning(); }

        // --- Timer Info Functions ---
        getCurrentUnixTimestamp() { return getCurrentUnixTimestamp(); }
        getCurrentMilliseconds() { return getCurrentMilliseconds(); }
        getCurrentTimeComponent(args) { return getCurrentTimeComponent(args); }
        getCurrentDayOfWeek() { return getCurrentDayOfWeek(); }
        getCurrentMonthName() { return getCurrentMonthName(); }
        getDaysSince2000() { return getDaysSince2000(); }
        getTimestampAsDateString(args) { return getTimestampAsDateString(args); }
        getTimestampAsTimeString(args) { return getTimestampAsTimeString(args); }

        // --- Time Calculation Functions ---
        getTimeDifference(args) { return getTimeDifference(args); }
        addTimeToTimestamp(args) { return addTimeToTimestamp(args); }
        convertTimeUnits(args) { return convertTimeUnits(args); }
        convertMillisecondsToUnit(args) { return convertMillisecondsToUnit(args); }
        daysUntilDate(args) { return daysUntilDate(args); }
        daysAfterDate(args) { return daysAfterDate(args); }
        isSpecificDateToday(args) { return isSpecificDateToday(args); }
        isTimestampBefore(args) { return isTimestampBefore(args); }
        isTimestampAfter(args) { return isTimestampAfter(args); }
        isSameDay(args) { return isSameDay(args); }
    }

    Scratch.extensions.register(new TimerPlusExtension());
})(Scratch);