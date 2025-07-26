// Firebase Auth & DB Extension
// Made by Toxic5018
// Follow my website: https://toxic5018.github.io/toxic5018.me/.

(async function (Scratch) {
    if (!Scratch.extensions.unsandboxed) {
        alert("This extension needs to be unsandboxed to run Firebase Authentication and Database!");
        return;
    }

    // --- Firebase Setup: Configuration Variables ---
    let _apiKey = "",
        _authDomain = "",
        _databaseURL = "",
        _projectId = "",
        _storageBucket = "",
        _messagingSenderId = "",
        _appId = "",
        _measurementId = "";

    let firebaseApp = null,
        auth = null,
        database = null,
        currentUser = null;

    let lastError = "",
        lastOperationStatus = "",
        _isFirebaseConnected = false,
        _isFirebaseInitialized = false,
        _isLoggedIn = false,
        _isEmailVerified = false;

    // New status codes for operations: -1 = no operation, 0 = success, 1 = failed
    let _lastGoogleSignInStatusCode = -1;
    let _lastLoginStatusCode = -1;
    let _lastRegisterStatusCode = -1;

    const databaseListeners = new Map();
    let lastFetchedDatabaseValue = "",
        lastListenedDatabaseValue = "";

    const fireEvent = (eventName, detail = {}) => {
        Scratch.vm.runtime.emit(eventName, detail);
    };

    const loadFirebaseSDK = (src) =>
        new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = src;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });

    async function initializeFirebase() {
        lastError = "";
        lastOperationStatus = "";
        if (!_apiKey || !_authDomain || !_projectId || !_appId || !_databaseURL) {
            lastError = "Missing critical Firebase configuration.";
            lastOperationStatus = "Failed to initialize Firebase.";
            _isFirebaseConnected = false;
            fireEvent("toxic5018FirebaseAuthDB_onFirebaseNotConnected");
            return false;
        }
        try {
            if (!firebaseApp) {
                const cfg = {
                    apiKey: _apiKey,
                    authDomain: _authDomain,
                    databaseURL: _databaseURL,
                    projectId: _projectId,
                    storageBucket: _storageBucket,
                    messagingSenderId: _messagingSenderId,
                    appId: _appId,
                    measurementId: _measurementId,
                };
                firebaseApp = firebase.initializeApp(cfg);
                auth = firebaseApp.auth();
                database = firebaseApp.database();
                auth.onAuthStateChanged((user) => {
                    currentUser = user;
                    _isLoggedIn = !!user;
                    _isEmailVerified = user ? user.emailVerified : false;
                });
                lastOperationStatus = "Initialized Firebase.";
                _isFirebaseConnected = true;
                _isFirebaseInitialized = true;
                fireEvent("toxic5018FirebaseAuthDB_onFirebaseConnected");
            } else {
                lastOperationStatus = "Firebase already initialized.";
                _isFirebaseConnected = true;
            }
            return true;
        } catch (e) {
            lastError = e.message;
            lastOperationStatus = "Failed to initialize Firebase.";
            _isFirebaseConnected = false;
            fireEvent("toxic5018FirebaseAuthDB_onFirebaseNotConnected");
            return false;
        }
    }

    function resetFirebaseExtension() {
        lastError = "";
        lastOperationStatus = "";
        databaseListeners.forEach((cb, path) => {
            if (database) database.ref(path).off("value", cb);
        });
        databaseListeners.clear();
        firebaseApp = auth = database = currentUser = null;
        _apiKey = _authDomain = _databaseURL = _projectId = _storageBucket = _messagingSenderId = _appId = _measurementId = "";
        _isFirebaseConnected = _isFirebaseInitialized = _isLoggedIn = _isEmailVerified = false;
        lastFetchedDatabaseValue = lastListenedDatabaseValue = "";
        _lastGoogleSignInStatusCode = -1;
        _lastLoginStatusCode = -1;
        _lastRegisterStatusCode = -1;
        lastOperationStatus = "Reset extension state.";
        fireEvent("toxic5018FirebaseAuthDB_onFirebaseNotConnected");
        return true;
    }

    // SDK loaders
    async function loadFirebaseAppSDK(args) {
        return loadFirebaseSDK(
            `https://www.gstatic.com/firebasejs/${args.VERSION}/firebase-app-compat.js`
        );
    }
    async function loadFirebaseAuthSDK(args) {
        return loadFirebaseSDK(
            `https://www.gstatic.com/firebasejs/${args.VERSION}/firebase-auth-compat.js`
        );
    }
    async function loadFirebaseDatabaseSDK(args) {
        return loadFirebaseSDK(
            `https://www.gstatic.com/firebasejs/${args.VERSION}/firebase-database-compat.js`
        );
    }

    // Config setters
    const setApiKey = (args) => (_apiKey = args.KEY);
    const setAuthDomain = (args) => (_authDomain = args.DOMAIN);
    const setDatabaseURL = (args) => (_databaseURL = args.URL);
    const setProjectId = (args) => (_projectId = args.ID);
    const setStorageBucket = (args) => (_storageBucket = args.BUCKET);
    const setMessagingSenderId = (args) => (_messagingSenderId = args.ID);
    const setAppId = (args) => (_appId = args.ID);
    const setMeasurementId = (args) => (_measurementId = args.ID);

    // Auth flows
    async function registerUser(args) {
        lastError = "";
        lastOperationStatus = "";
        if (!auth) {
            lastError = "Firebase not initialized.";
            lastOperationStatus = "Register failed.";
            _lastRegisterStatusCode = 1; // Failed
            fireEvent("toxic5018FirebaseAuthDB_onRegisterFailed");
            return false;
        }
        try {
            const uc = await auth.createUserWithEmailAndPassword(
                args.EMAIL,
                args.PASSWORD
            );
            currentUser = uc.user;
            _isLoggedIn = true;
            _isEmailVerified = currentUser.emailVerified;
            lastOperationStatus = "User registered.";
            _lastRegisterStatusCode = 0; // Success
            fireEvent("toxic5018FirebaseAuthDB_onRegisterSuccessful");
            return true;
        } catch (e) {
            lastError = e.message;
            lastOperationStatus = "Register failed.";
            _lastRegisterStatusCode = 1; // Failed
            fireEvent("toxic5018FirebaseAuthDB_onRegisterFailed");
            return false;
        }
    }
    async function loginUser(args) {
        lastError = "";
        lastOperationStatus = "";
        if (!auth) {
            lastError = "Firebase not initialized.";
            lastOperationStatus = "Login failed.";
            _lastLoginStatusCode = 1; // Failed
            fireEvent("toxic5018FirebaseAuthDB_onLoginFailed");
            return false;
        }
        try {
            const uc = await auth.signInWithEmailAndPassword(
                args.EMAIL,
                args.PASSWORD
            );
            currentUser = uc.user;
            _isLoggedIn = true;
            _isEmailVerified = currentUser.emailVerified;
            lastOperationStatus = "User logged in.";
            _lastLoginStatusCode = 0; // Success
            fireEvent("toxic5018FirebaseAuthDB_onLoginSuccessful");
            return true;
        } catch (e) {
            lastError = e.message;
            lastOperationStatus = "Login failed.";
            _lastLoginStatusCode = 1; // Failed
            fireEvent("toxic5018FirebaseAuthDB_onLoginFailed");
            return false;
        }
    }

    async function signInWithGoogle() {
        lastError = "";
        lastOperationStatus = "";
        if (!auth) {
            lastError = "Firebase not initialized.";
            lastOperationStatus = "Google Sign-In failed.";
            _lastGoogleSignInStatusCode = 1; // Failed
            fireEvent("toxic5018FirebaseAuthDB_onGoogleLoginFailed");
            return false;
        }
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const uc = await auth.signInWithPopup(provider);
            currentUser = uc.user;
            _isLoggedIn = true;
            _isEmailVerified = currentUser.emailVerified;
            lastOperationStatus = "Google Sign-In successful.";
            _lastGoogleSignInStatusCode = 0; // Success
            fireEvent("toxic5018FirebaseAuthDB_onGoogleLoginSuccessful");
            return true;
        } catch (e) {
            lastError = e.message;
            lastOperationStatus = "Google Sign-In failed.";
            _lastGoogleSignInStatusCode = 1; // Failed
            fireEvent("toxic5018FirebaseAuthDB_onGoogleLoginFailed");
            return false;
        }
    }

    async function updateProfileUsername(args) {
        lastError = "";
        lastOperationStatus = "";
        if (!currentUser) {
            lastError = "No user logged in.";
            lastOperationStatus = "Failed to set username.";
            return false;
        }
        try {
            await currentUser.updateProfile({ displayName: args.USERNAME });
            lastOperationStatus = "Username updated successfully.";
            return true;
        } catch (e) {
            lastError = e.message;
            lastOperationStatus = "Failed to set username.";
            return false;
        }
    }

    function getCurrentUsername() {
        return currentUser ? (currentUser.displayName || "") : "";
    }

    function setAuthorizedDomainLink(args) {
        lastOperationStatus = `Authorized domain link acknowledged: ${args.DOMAIN}. Note: This is a client-side placeholder. Authorized domains are configured in your Firebase project settings.`;
        return true;
    }

    async function logoutUser() {
        if (!auth) return false;
        await auth.signOut();
        currentUser = null;
        _isLoggedIn = _isEmailVerified = false;
        return true;
    }
    function getCurrentUserId() {
        return currentUser ? currentUser.uid : "";
    }
    function isUserLoggedIn() {
        return _isLoggedIn;
    }
    function isUserNotLoggedIn() {
        return !_isLoggedIn;
    }

    // Email verification
    async function sendVerificationEmail() {
        if (!currentUser) {
            fireEvent("toxic5018FirebaseAuthDB_onVerificationFailed");
            return false;
        }
        if (currentUser.emailVerified) {
            fireEvent("toxic5018FirebaseAuthDB_onVerificationSuccessful");
            return true;
        }
        try {
            await currentUser.sendEmailVerification();
            fireEvent("toxic5018FirebaseAuthDB_onVerificationSent");
            return true;
        } catch (e) {
            fireEvent("toxic5018FirebaseAuthDB_onVerificationFailed");
            return false;
        }
    }
    function isEmailVerified() {
        return _isEmailVerified;
    }

    // Database ops
    function parseValueForDatabase(v) {
        try {
            return JSON.parse(v);
        } catch {
            return v;
        }
    }
    async function setDatabaseValue(args) {
        if (!database) return false;
        await database.ref(args.PATH).set(parseValueForDatabase(args.VALUE));
        return true;
    }
    async function updateDatabaseValue(args) {
        if (!database) return false;
        const o = parseValueForDatabase(args.VALUE);
        if (typeof o !== "object" || Array.isArray(o)) return false;
        await database.ref(args.PATH).update(o);
        return true;
    }
    async function pushDatabaseValue(args) {
        if (!database) return false;
        await database.ref(args.PATH).push(parseValueForDatabase(args.VALUE));
        return true;
    }
    async function deleteDatabaseValue(args) {
        if (!database) return false;
        await database.ref(args.PATH).remove();
        return true;
    }
    async function getDatabaseValue(args) {
        if (!database) return "";
        const snap = await database.ref(args.PATH).once("value");
        const v = snap.val();
        lastFetchedDatabaseValue =
            typeof v === "object" ? JSON.stringify(v) : String(v);
        return lastFetchedDatabaseValue;
    }
    async function databasePathExists(args) {
        if (!database) return false;
        const snap = await database.ref(args.PATH).once("value");
        return snap.exists();
    }
    function startListeningToDatabase(args) {
        if (!database) return false;
        if (databaseListeners.has(args.PATH)) return true;
        const cb = database
            .ref(args.PATH)
            .on(
                "value",
                (s) => {
                    const v = s.val();
                    lastListenedDatabaseValue =
                        typeof v === "object" ? JSON.stringify(v) : String(v);
                },
                (e) => {
                    lastError = e.message;
                }
            );
        databaseListeners.set(args.PATH, cb);
        return true;
    }
    function stopListeningToDatabase(args) {
        if (!database) return false;
        const cb = databaseListeners.get(args.PATH);
        if (cb) {
            database.ref(args.PATH).off("value", cb);
            databaseListeners.delete(args.PATH);
            return true;
        }
        return false;
    }
    function getLastListenedDatabaseValue() {
        return lastListenedDatabaseValue;
    }

    // JSON helper
    function getValueFromJsonPath(args) {
        try {
            const data = JSON.parse(args.JSON_STRING);
            const parts = args.JSON_PATH.split("/").filter((p) => p);
            let cur = data;
            for (const p of parts) {
                if (cur && typeof cur === "object" && p in cur) {
                    cur = cur[p];
                } else {
                    return "";
                }
            }
            return typeof cur === "object" ? JSON.stringify(cur) : String(cur);
        } catch {
            return "";
        }
    }

    // Error/status reporters
    const getLastErrorMessage = () => lastError;
    const getLastOperationStatus = () => lastOperationStatus;
    const getLastGoogleSignInStatusCode = () => _lastGoogleSignInStatusCode;
    const getLastLoginStatusCode = () => _lastLoginStatusCode;
    const getLastRegisterStatusCode = () => _lastRegisterStatusCode;

    // --- Extension Definition ---
    class FirebaseAuthDBExtension {
        constructor(runtime) {
            this.runtime = runtime;
        }
        getInfo() {
            const blockIcon1 = "https://github.com/toxic5018/T4Extensions/blob/main/assets/textures/block1.png?raw=true"; // Database
            const blockIcon2 = "https://github.com/toxic5018/T4Extensions/blob/main/assets/textures/block2.png?raw=true"; // User Accounts
            const blockIcon3 = "https://github.com/toxic5018/T4Extensions/blob/main/assets/textures/block3.png?raw=true"; // Core/Config
            const blockIcon4 = "https://github.com/toxic5018/T4Extensions/blob/main/assets/textures/block4.png?raw=true"; // Email Verification

            return {
                id: "toxic5018FirebaseAuthDB",
                name: "Firebase Auth & DB",
                color1: "#FFA000",
                color2: "#FF8F00",
                tbShow: true,
                menuIconURI: "https://github.com/toxic5018/T4Extensions/blob/main/assets/textures/extensions/logo/firebase_extension_logo.png?raw=true",
                blockIconURI: blockIcon1, // Default block icon to database related blocks
                blocks: [
                    {
                        opcode: "extensionVersion",
                        blockType: Scratch.BlockType.LABEL,
                        text: "Version 1.0.0",
                        blockIconURI: blockIcon3,
                    },
                    "---",
                    {
                        opcode: "labelCoreSetup",
                        blockType: Scratch.BlockType.LABEL,
                        text: "--- Firebase Core Setup ---",
                        blockIconURI: blockIcon3,
                    },
                    {
                        opcode: "loadFirebaseAppSDK",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "load Firebase SDK version [VERSION] app compat",
                        arguments: {
                            VERSION: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "9.0.0",
                            },
                        },
                        func: "loadFirebaseAppSDK",
                        blockIconURI: blockIcon3,
                    },
                    {
                        opcode: "loadFirebaseAuthSDK",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "load Firebase SDK version [VERSION] auth compat",
                        arguments: {
                            VERSION: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "9.0.0",
                            },
                        },
                        func: "loadFirebaseAuthSDK",
                        blockIconURI: blockIcon3,
                    },
                    {
                        opcode: "loadFirebaseDatabaseSDK",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "load Firebase SDK version [VERSION] database compat",
                        arguments: {
                            VERSION: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "9.0.0",
                            },
                        },
                        func: "loadFirebaseDatabaseSDK",
                        blockIconURI: blockIcon3,
                    },
                    {
                        opcode: "initializeFirebase",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "initialize Firebase",
                        func: "initializeFirebase",
                        blockIconURI: blockIcon3,
                    },
                    {
                        opcode: "resetFirebaseExtension",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "reset Firebase extension state",
                        func: "resetFirebaseExtension",
                        blockIconURI: blockIcon3,
                    },
                    "---",
                    {
                        opcode: "isFirebaseConnected",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "is Firebase connected?",
                        func: "isFirebaseConnected",
                        blockIconURI: blockIcon3,
                    },
                    {
                        opcode: "isFirebaseNotConnected",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "is Firebase not connected?",
                        func: "isFirebaseNotConnected",
                        blockIconURI: blockIcon3,
                    },
                    {
                        opcode: "onFirebaseConnected",
                        blockType: Scratch.BlockType.HAT,
                        text: "on Firebase connected",
                        func: "onFirebaseConnected",
                        blockIconURI: blockIcon3,
                    },
                    {
                        opcode: "onFirebaseNotConnected",
                        blockType: Scratch.BlockType.HAT,
                        text: "on Firebase not connected",
                        func: "onFirebaseNotConnected",
                        blockIconURI: blockIcon3,
                    },
                    "---",
                    {
                        opcode: "labelFirebaseConfig",
                        blockType: Scratch.BlockType.LABEL,
                        text: "--- Firebase Config ---",
                        blockIconURI: blockIcon3,
                    },
                    {
                        opcode: "setApiKey",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set API Key [KEY]",
                        arguments: {
                            KEY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "your_api_key",
                            },
                        },
                        func: "setApiKey",
                        blockIconURI: blockIcon3,
                    },
                    {
                        opcode: "setAuthDomain",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set Auth Domain [DOMAIN]",
                        arguments: {
                            DOMAIN: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "your_auth_domain",
                            },
                        },
                        func: "setAuthDomain",
                        blockIconURI: blockIcon3,
                    },
                    {
                        opcode: "setDatabaseURL",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set Database URL [URL]",
                        arguments: {
                            URL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue:
                                    "https://your-project-default-rtdb.firebaseio.com",
                            },
                        },
                        func: "setDatabaseURL",
                        blockIconURI: blockIcon3,
                    },
                    {
                        opcode: "setProjectId",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set Project ID [ID]",
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "your_project_id",
                            },
                        },
                        func: "setProjectId",
                        blockIconURI: blockIcon3,
                    },
                    {
                        opcode: "setStorageBucket",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set Storage Bucket [BUCKET] (optional)",
                        arguments: {
                            BUCKET: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "your_storage_bucket",
                            },
                        },
                        func: "setStorageBucket",
                        blockIconURI: blockIcon3,
                    },
                    {
                        opcode: "setMessagingSenderId",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set Messaging Sender ID [ID] (optional)",
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "your_messaging_sender_id",
                            },
                        },
                        func: "setMessagingSenderId",
                        blockIconURI: blockIcon3,
                    },
                    {
                        opcode: "setAppId",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set App ID [ID]",
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "your_app_id",
                            },
                        },
                        func: "setAppId",
                        blockIconURI: blockIcon3,
                    },
                    {
                        opcode: "setMeasurementId",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set Measurement ID [ID] (optional)",
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "G-XXXXXXXXXX",
                            },
                        },
                        func: "setMeasurementId",
                        blockIconURI: blockIcon3,
                    },
                    "---",
                    {
                        opcode: "labelUserAccounts",
                        blockType: Scratch.BlockType.LABEL,
                        text: "--- Firebase Auth: User Accounts ---",
                        blockIconURI: blockIcon2,
                    },
                    {
                        opcode: "registerUser",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "register user [EMAIL] with password [PASSWORD]",
                        arguments: {
                            EMAIL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "test@example.com",
                            },
                            PASSWORD: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "password123",
                            },
                        },
                        func: "registerUser",
                        blockIconURI: blockIcon2,
                    },
                    {
                        opcode: "loginUser",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "log in user [EMAIL] with password [PASSWORD]",
                        arguments: {
                            EMAIL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "test@example.com",
                            },
                            PASSWORD: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "password123",
                            },
                        },
                        func: "loginUser",
                        blockIconURI: blockIcon2,
                    },
                    {
                        opcode: "signInWithGoogle",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "login/register with Google",
                        func: "signInWithGoogle",
                        blockIconURI: blockIcon2,
                    },
                    {
                        opcode: "updateLoginUsername",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set login username to [USERNAME]",
                        arguments: {
                            USERNAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "NewUser",
                            },
                        },
                        func: "updateProfileUsername",
                        blockIconURI: blockIcon2,
                    },
                    {
                        opcode: "getCurrentUsername",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "current username",
                        func: "getCurrentUsername",
                        blockIconURI: blockIcon2,
                    },
                    {
                        opcode: "setAuthorizedDomainLink",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "authorized domain link [DOMAIN]",
                        arguments: {
                            DOMAIN: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "example.com",
                            },
                        },
                        func: "setAuthorizedDomainLink",
                        blockIconURI: blockIcon2,
                    },
                    {
                        opcode: "logoutUser",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "log out user",
                        func: "logoutUser",
                        blockIconURI: blockIcon2,
                    },
                    {
                        opcode: "getCurrentUserId",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "current user ID",
                        func: "getCurrentUserId",
                        blockIconURI: blockIcon2,
                    },
                    {
                        opcode: "isUserLoggedIn",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "is user logged in?",
                        func: "isUserLoggedIn",
                        blockIconURI: blockIcon2,
                    },
                    {
                        opcode: "isUserNotLoggedIn",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "is user not logged in?",
                        func: "isUserNotLoggedIn",
                        blockIconURI: blockIcon2,
                    },
                    {
                        opcode: "onLoginSuccessful",
                        blockType: Scratch.BlockType.HAT,
                        text: "on Login successful",
                        func: "onLoginSuccessful",
                        blockIconURI: blockIcon2,
                    },
                    {
                        opcode: "onLoginFailed",
                        blockType: Scratch.BlockType.HAT,
                        text: "on Login failed",
                        func: "onLoginFailed",
                        blockIconURI: blockIcon2,
                    },
                    {
                        opcode: "onRegisterSuccessful",
                        blockType: Scratch.BlockType.HAT,
                        text: "on Register successful",
                        func: "onRegisterSuccessful",
                        blockIconURI: blockIcon2,
                    },
                    {
                        opcode: "onRegisterFailed",
                        blockType: Scratch.BlockType.HAT,
                        text: "on Register failed",
                        func: "onRegisterFailed",
                        blockIconURI: blockIcon2,
                    },
                    {
                        opcode: "onGoogleLoginSuccessful",
                        blockType: Scratch.BlockType.HAT,
                        text: "on Google login successful",
                        func: "onGoogleLoginSuccessful",
                        blockIconURI: blockIcon2,
                    },
                    {
                        opcode: "onGoogleLoginFailed",
                        blockType: Scratch.BlockType.HAT,
                        text: "on Google login failed",
                        func: "onGoogleLoginFailed",
                        blockIconURI: blockIcon2,
                    },
                    {
                        opcode: "getLastGoogleSignInStatusCode",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "last Google Sign-In status code",
                        func: "getLastGoogleSignInStatusCode",
                        blockIconURI: blockIcon2,
                    },
                    {
                        opcode: "getLastLoginStatusCode",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "last Login status code",
                        func: "getLastLoginStatusCode",
                        blockIconURI: blockIcon2,
                    },
                    {
                        opcode: "getLastRegisterStatusCode",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "last Register status code",
                        func: "getLastRegisterStatusCode",
                        blockIconURI: blockIcon2,
                    },
                    "---",
                    {
                        opcode: "labelEmailVerification",
                        blockType: Scratch.BlockType.LABEL,
                        text: "--- Firebase Auth: Email Verification ---",
                        blockIconURI: blockIcon4,
                    },
                    {
                        opcode: "sendVerificationEmail",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "send verification email",
                        func: "sendVerificationEmail",
                        blockIconURI: blockIcon4,
                    },
                    {
                        opcode: "isEmailVerified",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "email verified?",
                        func: "isEmailVerified",
                        blockIconURI: blockIcon4,
                    },
                    {
                        opcode: "onVerificationSuccessful",
                        blockType: Scratch.BlockType.HAT,
                        text: "on Verification successful",
                        func: "onVerificationSuccessful",
                        blockIconURI: blockIcon4,
                    },
                    {
                        opcode: "onVerificationFailed",
                        blockType: Scratch.BlockType.HAT,
                        text: "on Verification failed",
                        func: "onVerificationFailed",
                        blockIconURI: blockIcon4,
                    },
                    {
                        opcode: "onVerificationSent",
                        blockType: Scratch.BlockType.HAT,
                        text: "on Verification sent",
                        func: "onVerificationSent",
                        blockIconURI: blockIcon4,
                    },
                    "---",
                    {
                        opcode: "labelDataOperations",
                        blockType: Scratch.BlockType.LABEL,
                        text: "--- Firebase Realtime Database: Data Operations ---",
                        blockIconURI: blockIcon1,
                    },
                    {
                        opcode: "setDatabaseValue",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set database path [PATH] to value [VALUE]",
                        arguments: {
                            PATH: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "users/data",
                            },
                            VALUE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "hello",
                            },
                        },
                        func: "setDatabaseValue",
                        blockIconURI: blockIcon1,
                    },
                    {
                        opcode: "updateDatabaseValue",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "update database path [PATH] with [VALUE] (JSON)",
                        arguments: {
                            PATH: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "users/data",
                            },
                            VALUE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: '{"score": 100}',
                            },
                        },
                        func: "updateDatabaseValue",
                        blockIconURI: blockIcon1,
                    },
                    {
                        opcode: "pushDatabaseValue",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "push value [VALUE] to database path [PATH]",
                        arguments: {
                            VALUE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "New message",
                            },
                            PATH: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "messages/",
                            },
                        },
                        func: "pushDatabaseValue",
                        blockIconURI: blockIcon1,
                    },
                    {
                        opcode: "deleteDatabaseValue",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "delete database path [PATH]",
                        arguments: {
                            PATH: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "users/data",
                            },
                        },
                        func: "deleteDatabaseValue",
                        blockIconURI: blockIcon1,
                    },
                    {
                        opcode: "getDatabaseValue",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "get database value from path [PATH]",
                        arguments: {
                            PATH: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "users/data",
                            },
                        },
                        func: "getDatabaseValue",
                        blockIconURI: blockIcon1,
                    },
                    {
                        opcode: "databasePathExists",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "database path [PATH] exists?",
                        arguments: {
                            PATH: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "users/data",
                            },
                        },
                        func: "databasePathExists",
                        blockIconURI: blockIcon1,
                    },
                    {
                        opcode: "getValueFromJsonPath",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "get value from JSON [JSON_STRING] from path [JSON_PATH]",
                        arguments: {
                            JSON_STRING: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue:
                                    '{"name":"Alice","score":100,"details":{"level":5}}',
                            },
                            JSON_PATH: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "score",
                            },
                        },
                        func: "getValueFromJsonPath",
                        blockIconURI: blockIcon1,
                    },
                    "---",
                    {
                        opcode: "labelDatabaseListeners",
                        blockType: Scratch.BlockType.LABEL,
                        text: "--- Firebase Realtime Database: Listeners ---",
                        blockIconURI: blockIcon1,
                    },
                    {
                        opcode: "startListeningToDatabase",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "start listening to database path [PATH]",
                        arguments: {
                            PATH: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "live_data/sensor_read",
                            },
                        },
                        func: "startListeningToDatabase",
                        blockIconURI: blockIcon1,
                    },
                    {
                        opcode: "stopListeningToDatabase",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "stop listening to database path [PATH]",
                        arguments: {
                            PATH: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "live_data/sensor_read",
                            },
                        },
                        func: "stopListeningToDatabase",
                        blockIconURI: blockIcon1,
                    },
                    {
                        opcode: "getLastListenedDatabaseValue",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "last listened database value",
                        func: "getLastListenedDatabaseValue",
                        blockIconURI: blockIcon1,
                    },
                    "---",
                    {
                        opcode: "labelErrorHandling",
                        blockType: Scratch.BlockType.LABEL,
                        text: "--- Firebase Error Handling ---",
                        blockIconURI: blockIcon1,
                    },
                    {
                        opcode: "getLastErrorMessage",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "last Firebase error",
                        func: "getLastErrorMessage",
                        blockIconURI: blockIcon1,
                    },
                    {
                        opcode: "getLastOperationStatus",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "last operation status",
                        func: "getLastOperationStatus",
                        blockIconURI: blockIcon1,
                    },
                ],
                menus: {},
            };
        }

        // CORE SDK LOADERS
        loadFirebaseAppSDK(args) {
            return loadFirebaseAppSDK(args);
        }
        loadFirebaseAuthSDK(args) {
            return loadFirebaseAuthSDK(args);
        }
        loadFirebaseDatabaseSDK(args) {
            return loadFirebaseDatabaseSDK(args);
        }
        initializeFirebase() {
            return initializeFirebase();
        }
        resetFirebaseExtension() {
            return resetFirebaseExtension();
        }
        isFirebaseConnected() {
            return _isFirebaseConnected;
        }
        isFirebaseNotConnected() {
            return !_isFirebaseConnected;
        }

        // HAT STUBS (must exist so VM finds them)
        onFirebaseConnected() {}
        onFirebaseNotConnected() {}
        onLoginSuccessful() {}
        onLoginFailed() {}
        onRegisterSuccessful() {}
        onRegisterFailed() {}
        onVerificationSuccessful() {}
        onVerificationFailed() {}
        onVerificationSent() {}
        onGoogleLoginSuccessful() {}
        onGoogleLoginFailed() {}

        // CONFIG
        setApiKey(args) {
            return setApiKey(args);
        }
        setAuthDomain(args) {
            return setAuthDomain(args);
        }
        setDatabaseURL(args) {
            return setDatabaseURL(args);
        }
        setProjectId(args) {
            return setProjectId(args);
        }
        setStorageBucket(args) {
            return setStorageBucket(args);
        }
        setMessagingSenderId(args) {
            return setMessagingSenderId(args);
        }
        setAppId(args) {
            return setAppId(args);
        }
        setMeasurementId(args) {
            return setMeasurementId(args);
        }

        // AUTH
        registerUser(args) {
            return registerUser(args);
        }
        loginUser(args) {
            return loginUser(args);
        }
        signInWithGoogle() {
            return signInWithGoogle();
        }
        updateProfileUsername(args) {
            return updateProfileUsername(args);
        }
        getCurrentUsername() {
            return getCurrentUsername();
        }
        setAuthorizedDomainLink(args) {
            return setAuthorizedDomainLink(args);
        }
        logoutUser() {
            return logoutUser();
        }
        getCurrentUserId() {
            return getCurrentUserId();
        }
        isUserLoggedIn() {
            return isUserLoggedIn();
        }
        isUserNotLoggedIn() {
            return isUserNotLoggedIn();
        }

        // EMAIL VERIFICATION
        sendVerificationEmail() {
            return sendVerificationEmail();
        }
        isEmailVerified() {
            return isEmailVerified();
        }

        // DATABASE
        setDatabaseValue(args) {
            return setDatabaseValue(args);
        }
        updateDatabaseValue(args) {
            return updateDatabaseValue(args);
        }
        pushDatabaseValue(args) {
            return pushDatabaseValue(args);
        }
        deleteDatabaseValue(args) {
            return deleteDatabaseValue(args);
        }
        getDatabaseValue(args) {
            return getDatabaseValue(args);
        }
        databasePathExists(args) {
            return databasePathExists(args);
        }
        getValueFromJsonPath(args) {
            return getValueFromJsonPath(args);
        }
        startListeningToDatabase(args) {
            return startListeningToDatabase(args);
        }
        stopListeningToDatabase(args) {
            return stopListeningToDatabase(args);
        }
        getLastListenedDatabaseValue() {
            return getLastListenedDatabaseValue();
        }

        // ERROR / STATUS
        getLastErrorMessage() {
            return getLastErrorMessage();
        }
        getLastOperationStatus() {
            return getLastOperationStatus();
        }
        getLastGoogleSignInStatusCode() {
            return getLastGoogleSignInStatusCode();
        }
        getLastLoginStatusCode() {
            return getLastLoginStatusCode();
        }
        getLastRegisterStatusCode() {
            return getLastRegisterStatusCode();
        }
    }

    Scratch.extensions.register(new FirebaseAuthDBExtension());
})(Scratch);