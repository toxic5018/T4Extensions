// Import Firebase SDKs from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

// Import console messages from a separate file
import './console.js';

// Your web app's Firebase configuration (using your provided details)
const firebaseConfig = {
    apiKey: "AIzaSyDjI46S2PGPbUsdvQfWXA0EQ6Pd9lpBRCE",
    authDomain: "toxicstudios-6de44.firebaseapp.com",
    databaseURL: "https://toxicstudios-6de44-default-rtdb.firebaseio.com",
    projectId: "toxicstudios-6de44",
    storageBucket: "toxicstudios-6de44.firebasestorage.app",
    messagingSenderId: "22447277764",
    appId: "1:22447277764:web:5000361bdbb17e49b6ab91",
    measurementId: "G-SK5BEYJFS5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app); // Keep analytics if you need it

// Initialize Firebase Realtime Database
const database = getDatabase(app);
const dbRef = ref(database); // Root reference for database operations

// --- Device ID and Hashing Utilities ---
const LOCAL_STORAGE_DEVICE_ID_KEY = 't4extensions_device_id';

// Function to generate a UUID (Universally Unique Identifier)
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Function to get or create a unique device ID and store it in localStorage
function getOrCreateDeviceId() {
    let deviceId = localStorage.getItem(LOCAL_STORAGE_DEVICE_ID_KEY);
    if (!deviceId) {
        deviceId = generateUUID();
        localStorage.setItem(LOCAL_STORAGE_DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
}

// Function to hash a string using SHA-256 (asynchronous)
async function hashString(str) {
    const textEncoder = new TextEncoder();
    const data = textEncoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedString = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashedString;
}

// --- Time Formatting Function (NEW) ---
function formatTimeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) {
        return 'Just Now';
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
        return `${days}d ago`;
    }

    const weeks = Math.floor(days / 7);
    if (weeks < 4) { // Roughly 4 weeks in a month
        return `${weeks}w ago`;
    }
    
    const months = Math.floor(days / 30.44); // Average days in a month
    if (months < 12) {
        return `${months}mo ago`; // Changed to 'mo' for months to avoid ambiguity with minutes
    }

    const years = Math.floor(days / 365.25);
    return `${years}y ago`;
}

// --- Number Formatting Function ---
function formatNumber(num) {
    if (num === null || num === undefined) {
        return 'N/A';
    }
    if (num < 1000) {
        return num.toString();
    }

    // Thousands
    if (num < 10000) { // 1K to 9.99K (e.g., 1.00K, 5.23K, 9.99K)
        return (num / 1000).toFixed(2) + 'K';
    } else if (num < 100000) { // 10K to 99.9K (e.g., 10.0K, 52.3K, 99.9K)
        return (num / 1000).toFixed(1) + 'K';
    } else if (num < 1000000) { // 100K to 999K (e.g., 100K, 523K, 999K)
        return Math.floor(num / 1000) + 'K';
    }
    // Millions
    else if (num < 10000000) { // 1M to 9.99M
        return (num / 1000000).toFixed(2) + 'M';
    } else if (num < 100000000) { // 10M to 99.9M
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num < 1000000000) { // 100M to 999M
        return Math.floor(num / 1000000) + 'M';
    }
    // Billions
    else { // 1B and above
        return (num / 1000000000).toFixed(2) + 'B';
    }
}


// Function to update a device's action for a specific stat in Firebase (GLOBAL COUNTS)
async function updateExtensionStatInFirebase(extensionId, statType, hashedDeviceId, add = true) {
    try {
        // Path to the specific device ID under the stat type's 'devices' list
        const path = `T4Studios/T4Extensions/Extension/${extensionId}/${statType}/devices/${hashedDeviceId}`;
        await set(ref(database, path), add ? true : null); // Set to true to add, null to remove
        // Removed detailed console.log for Firebase actions
    } catch (error) {
        console.error("Firebase: Error updating global stat:", error);
        showDownloadNotificationOverlay(`Failed to update global ${statType} in Firebase.`, "error");
    }
}

// NEW Function: Update a specific user's action for an extension (PER-USER STATUS)
async function updateUserActionInFirebase(extensionId, statType, hashedDeviceId, status) {
    try {
        // Path to the specific user's action for an extension and stat type
        const path = `T4Studios/UserActions/${hashedDeviceId}/${extensionId}/${statType}`;
        await set(ref(database, path), status); // Set to true/false
        // Removed detailed console.log for Firebase actions
    } catch (error) {
        console.error("Firebase: Error updating user action:", error);
        showDownloadNotificationOverlay(`Failed to update user action status in Firebase.`, "error");
    }
}

// NEW Function: Animate +1 or -1 text above a stat icon
function animateStatChange(statElement, value) {
    // Check if an animation is already running to prevent overlap
    if (statElement.querySelector('.stat-animation.animate')) {
        return;
    }

    const animationSpan = document.createElement('span');
    animationSpan.textContent = value;
    animationSpan.classList.add('stat-animation');

    // Position it initially (handled by CSS, but setting explicitly here for clarity if needed)
    animationSpan.style.position = 'absolute';
    animationSpan.style.left = '50%';
    animationSpan.style.transform = 'translateX(-50%)';
    animationSpan.style.opacity = '0'; // Start hidden
    animationSpan.style.pointerEvents = 'none'; // Make sure it doesn't block clicks

    statElement.appendChild(animationSpan);

    // Trigger reflow to ensure animation starts from initial state (opacity:1)
    void animationSpan.offsetWidth;

    // Add class to make it visible and start animation
    animationSpan.classList.add('animate');

    // Remove the element after the animation finishes
    animationSpan.addEventListener('animationend', () => {
        animationSpan.remove();
    }, { once: true });
}

// Global variable to hold all extensions data after fetching and combining
let ALL_EXTENSIONS_DATA = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Get or create the unique hashed device ID for this user/browser session
    const rawDeviceId = getOrCreateDeviceId();
    const hashedDeviceId = await hashString(rawDeviceId);

    // --- Load values.json for site-wide configurations ---
    let siteValues = {};
    try {
        const response = await fetch('values.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} from values.json`);
        }
        siteValues = await response.json();
        // Update footer version
        const siteVersionElement = document.getElementById('site-version');
        if (siteVersionElement) {
            siteVersionElement.textContent = siteValues.version || 'N/A';
        }
    } catch (error) {
        console.error('Error loading site values:', error);
        // Fallback for footer if values.json fails to load
        const siteVersionElement = document.getElementById('site-version');
        if (siteVersionElement) {
            siteVersionElement.textContent = 'Error';
        }
    }


    // --- Download Notification Overlay Elements ---
    const downloadNotificationOverlay = document.getElementById('download-notification-overlay');
    const notificationContent = document.getElementById('notification-content');
    const modalNotificationTitle = document.getElementById('modal-notification-title');
    const modalNotificationMessage = document.getElementById('modal-notification-message');
    // Removed direct reference to modalNotificationContinueButton here, will get it dynamically

    /**
     * Shows a modal-like notification overlay for download success/failure.
     * @param {string} message The message to display.
     * @param {'success'|'error'} type The type of notification (determines styling).
     * @param {function} [actionCallback] Optional callback for the "Continue" button.
     */
    function showDownloadNotificationOverlay(message, type, actionCallback = null) {
        // Get a fresh reference to the button to ensure it's the one currently in the DOM
        const currentModalNotificationContinueButton = downloadNotificationOverlay.querySelector('#modal-notification-continue-button');

        if (!currentModalNotificationContinueButton) {
            console.error("Error: Notification 'Continue' button not found within the overlay.");
            // If the button is not found, still display the message
            modalNotificationTitle.textContent = type === 'success' ? 'Success!' : 'Failed!';
            modalNotificationMessage.textContent = message;
            notificationContent.classList.remove('success', 'error');
            notificationContent.classList.add(type);
            downloadNotificationOverlay.classList.add('show');
            return;
        }

        modalNotificationTitle.textContent = type === 'success' ? 'Success!' : 'Failed!';
        modalNotificationMessage.textContent = message;

        // Reset classes and apply new type
        notificationContent.classList.remove('success', 'error');
        notificationContent.classList.add(type);

        // Clear previous event listener by replacing the node
        const oldButton = currentModalNotificationContinueButton;
        const newButton = oldButton.cloneNode(true);
        // Safely replace the button only if it still has a parent
        if (oldButton.parentNode) {
            oldButton.parentNode.replaceChild(newButton, oldButton);
        } else {
            console.warn("Notification continue button found but has no parent to replace. New listener will be added directly to the cloned button.");
            // If the old button is detached, we just add the listener to the new (cloned) button.
        }

        newButton.addEventListener('click', () => {
            downloadNotificationOverlay.classList.remove('show');
            if (actionCallback) {
                actionCallback();
            }
        });

        downloadNotificationOverlay.classList.add('show');
    }


    // --- Modal Elements ---
    const extensionDetailModal = document.getElementById('extension-detail-modal');
    const modalCloseButton = document.getElementById('modal-close-button');
    const modalTitle = document.getElementById('modal-title');
    const modalBannerThumbnail = document.getElementById('modal-banner-thumbnail');
    const modalDescription = document.getElementById('modal-description');
    const modalCreator = document.getElementById('modal-creator');
    const modalReleaseDate = document.getElementById('modal-release-date');
    const modalVersion = document.getElementById('modal-version');
    const modalLastUpdated = document.getElementById('modal-last-updated'); // This will now represent "Last Updated" or "Release Date"

    // NEW: Time Ago Spans
    const modalReleaseTimeAgo = document.getElementById('modal-release-time-ago'); // Keep for original release date in modal
    const modalVersionTimeAgo = document.getElementById('modal-version-time-ago');
    const modalLastUpdatedTimeAgo = document.getElementById('modal-last-updated-time-ago'); // This will now represent "Last Updated" or "Release Date" time ago

    const modalDownloadButton = document.getElementById('modal-download-button');

    // New Modal Stat Elements
    const modalLikesCountSpan = document.getElementById('modal-likes-count');
    const modalDislikesCountSpan = document.getElementById('modal-dislikes-count');
    const modalDownloadsCountSpan = document.getElementById('modal-downloads-count');
    const modalLikeStatItem = modalLikesCountSpan.closest('.stat-item');
    const modalDislikeStatItem = modalDislikesCountSpan.closest('.stat-item');

    // New Modal Action Buttons
    const modalLikeButton = document.getElementById('modal-like-button');
    const modalDislikeButton = document.getElementById('modal-dislike-button');


    // Function to open the extension detail modal
    function openExtensionDetailModal(extensionData) {
        if (!extensionData) {
            console.error('No extension data provided for modal.');
            return;
        }

        modalTitle.textContent = extensionData.name || 'Extension Details';
        modalBannerThumbnail.src = extensionData.bannerImage || 'assets/textures/extensions/banner/default_banner.png';
        modalDescription.textContent = extensionData.longDescription || extensionData.description || 'No detailed description available.';
        modalCreator.textContent = extensionData.creator || 'N/A';

        // --- Conditional Date Display in Modal ---
        const isSingleVersion = !Array.isArray(extensionData.version) || extensionData.version.length === 1;
        const displayDate = isSingleVersion ? extensionData.releaseDate : extensionData.lastUpdated;
        const displayDateLabel = isSingleVersion ? 'Release Date:' : 'Last Updated:';
        
        // Update the label and text content for the combined date field
        const modalCombinedDateLabel = document.getElementById('modal-combined-date-label'); // You'll need to add this span in HTML
        if(modalCombinedDateLabel) {
            modalCombinedDateLabel.textContent = displayDateLabel;
        }
        modalLastUpdated.textContent = displayDate || 'N/A'; // Using modalLastUpdated for the combined display
        modalLastUpdatedTimeAgo.textContent = formatTimeAgo(displayDate); // Using modalLastUpdatedTimeAgo for the combined display

        // Display the original release date specifically if multiple versions, otherwise it's the same as "Last Updated"
        const modalOriginalReleaseDateRow = document.getElementById('modal-original-release-date-row'); // You'll need to add this row in HTML
        if (modalOriginalReleaseDateRow) {
            if (!isSingleVersion) {
                modalOriginalReleaseDateRow.style.display = 'block'; // Show if it's a multi-version extension
                modalReleaseDate.textContent = extensionData.releaseDate || 'N/A';
                modalReleaseTimeAgo.textContent = formatTimeAgo(extensionData.releaseDate);
            } else {
                modalOriginalReleaseDateRow.style.display = 'none'; // Hide if single version
            }
        }


        modalVersion.textContent = Array.isArray(extensionData.version)
                                   ? extensionData.version[extensionData.version.length - 1]
                                   : extensionData.version || 'N/A';
        // Use the stored version's last change timestamp for 'time ago'
        modalVersionTimeAgo.textContent = formatTimeAgo(extensionData.versionLastChangeTimestamp);


        // Update modal stats with formatted numbers
        modalLikesCountSpan.textContent = formatNumber(extensionData.likes);
        modalDislikesCountSpan.textContent = formatNumber(extensionData.dislikes);
        modalDownloadsCountSpan.textContent = formatNumber(extensionData.downloads);

        // Set initial selected states for modal stat items and action buttons
        if (extensionData.userActions.liked) {
            modalLikeStatItem.classList.add('selected');
            modalLikeButton.classList.add('selected');
        } else {
            modalLikeStatItem.classList.remove('selected');
            modalLikeButton.classList.remove('selected');
        }

        if (extensionData.userActions.disliked) {
            modalDislikeStatItem.classList.add('selected');
            modalDislikeButton.classList.add('selected');
        } else {
            modalDislikeStatItem.classList.remove('selected');
            modalDislikeButton.classList.remove('selected');
        }

        // Store data on the download button for later use
        modalDownloadButton.dataset.extensionId = extensionData.id;
        modalDownloadButton.dataset.filePathToCopy = extensionData.filePathToCopy;

        // Hide / show the "Download" button if no file is specified
        if (!extensionData.filePathToCopy) {
            modalDownloadButton.style.display = 'none';
        } else {
            modalDownloadButton.style.display = 'inline-block';
        }

        // Show the modal
        extensionDetailModal.classList.add('show');
    }

    // Function to close the extension detail modal
    function closeExtensionDetailModal() {
        extensionDetailModal.classList.remove('show');
    }

    // Modal Close Button Event Listener
    modalCloseButton.addEventListener('click', closeExtensionDetailModal);

    // Close modal if clicking outside the content (on the overlay itself)
    extensionDetailModal.addEventListener('click', (event) => {
        if (event.target === extensionDetailModal) {
            closeExtensionDetailModal();
        }
    });


    // Event Listener for the Download button inside the modal
    modalDownloadButton.addEventListener('click', async (event) => {
        event.stopPropagation();
        const extensionId = modalDownloadButton.dataset.extensionId;
        const filePath = modalDownloadButton.dataset.filePathToCopy;

        const extension = ALL_EXTENSIONS_DATA.find(ext => ext.id === extensionId);
        if (!extension) {
            console.error('Extension data not found for ID:', extensionId);
            showDownloadNotificationOverlay("Extension data not found for download.", "error");
            return;
        }

        if (!filePath) {
            showDownloadNotificationOverlay("No file specified for this extension.", "error");
            return;
        }

        try {
            const fileResponse = await fetch(filePath);
            if (!fileResponse.ok) {
                throw new Error(`HTTP error! status: ${fileResponse.status} from ${filePath}`);
            }
            const fileContent = await fileResponse.text();

            // Using document.execCommand('copy') for better iframe compatibility
            const textarea = document.createElement('textarea');
            textarea.value = fileContent;
            textarea.style.position = 'fixed'; // Prevent scrolling to bottom of page
            textarea.style.left = '-9999px'; // Hide off-screen
            document.body.appendChild(textarea);
            textarea.select();
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    showDownloadNotificationOverlay("Successfully Copied to Clipboard!", "success");
                } else {
                    showDownloadNotificationOverlay("Failed to Copy to Clipboard! (execCommand failed)", "error");
                    console.error("Failed to copy using execCommand.");
                }
            } catch (err) {
                showDownloadNotificationOverlay("Failed to Copy to Clipboard! (execCommand error)", "error");
                console.error("Error with execCommand:", err);
            } finally {
                document.body.removeChild(textarea);
            }

            // Increment download count only if not already downloaded by this user
            if (!extension.userActions.downloaded) {
                // Update Firebase: Add device ID to downloads list (Global Count)
                await updateExtensionStatInFirebase(extensionId, 'downloads', hashedDeviceId, true);
                // Update Firebase: Set user's downloaded status (Per-User Status)
                await updateUserActionInFirebase(extensionId, 'downloaded', hashedDeviceId, true);

                // Update local object and UI immediately for responsiveness
                extension.userActions.downloaded = true;
                extension.downloads++; // Increment raw number

                // Update main grid item
                const gridExtensionItem = document.querySelector(`.extension-item[data-extension-id="${extensionId}"]`);
                if (gridExtensionItem) {
                    const downloadStatItem = gridExtensionItem.querySelector('.stat-item.download-stat');
                    const downloadCountSpan = downloadStatItem.querySelector('.stat-count');
                    downloadCountSpan.textContent = formatNumber(extension.downloads); // Format here
                    downloadStatItem.classList.add('counted-once'); // Mark visually
                    animateStatChange(downloadStatItem, '+1');
                } else {
                    console.warn('Could not find the main grid item for extension ID:', extensionId, 'to update download count.');
                }

                // Update modal's own download count
                modalDownloadsCountSpan.textContent = formatNumber(extension.downloads); // Format here
            }

            closeExtensionDetailModal(); // Close modal after successful copy/download
        } catch (error) {
            console.error('Failed to fetch file for clipboard:', error);
            showDownloadNotificationOverlay("Failed to Copy to Clipboard! (File fetch error)", "error");
        }
    });

    // Event Listener for Like button inside the modal
    modalLikeButton.addEventListener('click', async () => {
        const extensionId = modalDownloadButton.dataset.extensionId; // Get ID from associated download button
        const extension = ALL_EXTENSIONS_DATA.find(ext => ext.id === extensionId);

        if (!extension) {
            console.error('Extension data not found for modal like action:', extensionId);
            showDownloadNotificationOverlay("Extension data not found.", "error");
            return;
        }

        const wasLiked = extension.userActions.liked;
        const wasDisliked = extension.userActions.disliked;

        if (wasLiked) {
            await updateExtensionStatInFirebase(extensionId, 'likes', hashedDeviceId, false);
            await updateUserActionInFirebase(extensionId, 'liked', hashedDeviceId, false);
            extension.likes--;
            extension.userActions.liked = false;
            modalLikeStatItem.classList.remove('selected');
            modalLikeButton.classList.remove('selected');
            animateStatChange(modalLikeStatItem, '-1');
        } else {
            // If not liked, like it
            await updateExtensionStatInFirebase(extensionId, 'likes', hashedDeviceId, true);
            await updateUserActionInFirebase(extensionId, 'liked', hashedDeviceId, true);
            extension.likes++;
            extension.userActions.liked = true;
            modalLikeStatItem.classList.add('selected');
            modalLikeButton.classList.add('selected');
            animateStatChange(modalLikeStatItem, '+1');

            if (wasDisliked) {
                await updateExtensionStatInFirebase(extensionId, 'dislikes', hashedDeviceId, false);
                await updateUserActionInFirebase(extensionId, 'disliked', hashedDeviceId, false);
                extension.dislikes--;
                extension.userActions.disliked = false;
                modalDislikeStatItem.classList.remove('selected'); // Update modal dislike UI
                modalDislikeButton.classList.remove('selected');
            }
        }

        modalLikesCountSpan.textContent = formatNumber(extension.likes);
        modalDislikesCountSpan.textContent = formatNumber(extension.dislikes);

        // Update the main grid display as well
        const gridExtensionItem = document.querySelector(`.extension-item[data-extension-id="${extensionId}"]`);
        if (gridExtensionItem) {
            const gridLikeStatItem = gridExtensionItem.querySelector('.stat-item.like-stat');
            const gridDislikeStatItem = gridExtensionItem.querySelector('.stat-item.dislike-stat');
            gridLikeStatItem.querySelector('.stat-count').textContent = formatNumber(extension.likes);
            gridDislikeStatItem.querySelector('.stat-count').textContent = formatNumber(extension.dislikes);

            if (extension.userActions.liked) {
                gridLikeStatItem.classList.add('selected');
            } else {
                gridLikeStatItem.classList.remove('selected');
            }
            if (extension.userActions.disliked) {
                gridDislikeStatItem.classList.add('selected');
            } else {
                gridDislikeStatItem.classList.remove('selected');
            }
        }
    });

    // Event Listener for Dislike button inside the modal
    modalDislikeButton.addEventListener('click', async () => {
        const extensionId = modalDownloadButton.dataset.extensionId;
        const extension = ALL_EXTENSIONS_DATA.find(ext => ext.id === extensionId);

        if (!extension) {
            console.error('Extension data not found for modal dislike action:', extensionId);
            showDownloadNotificationOverlay("Extension data not found.", "error");
            return;
        }

        const wasLiked = extension.userActions.liked;
        const wasDisliked = extension.userActions.disliked;

        if (wasDisliked) {
            // If already disliked, un-dislike it
            await updateExtensionStatInFirebase(extensionId, 'dislikes', hashedDeviceId, false);
            await updateUserActionInFirebase(extensionId, 'disliked', hashedDeviceId, false);
            extension.dislikes--;
            extension.userActions.disliked = false;
            modalDislikeStatItem.classList.remove('selected');
            modalDislikeButton.classList.remove('selected');
            animateStatChange(modalDislikeStatItem, '-1');
        } else {
            // If not disliked, dislike it
            await updateExtensionStatInFirebase(extensionId, 'dislikes', hashedDeviceId, true);
            await updateUserActionInFirebase(extensionId, 'disliked', hashedDeviceId, true);
            extension.dislikes++;
            extension.userActions.disliked = true;
            modalDislikeStatItem.classList.add('selected');
            modalDislikeButton.classList.add('selected');
            animateStatChange(modalDislikeStatItem, '+1');

            if (wasLiked) {
                await updateExtensionStatInFirebase(extensionId, 'likes', hashedDeviceId, false);
                await updateUserActionInFirebase(extensionId, 'liked', hashedDeviceId, false);
                extension.likes--;
                extension.userActions.liked = false;
                modalLikeStatItem.classList.remove('selected'); // Update modal like UI
                modalLikeButton.classList.remove('selected');
            }
        }

        modalDislikesCountSpan.textContent = formatNumber(extension.dislikes);
        modalLikesCountSpan.textContent = formatNumber(extension.likes);

        // Update the main grid display as well
        const gridExtensionItem = document.querySelector(`.extension-item[data-extension-id="${extensionId}"]`);
        if (gridExtensionItem) {
            const gridLikeStatItem = gridExtensionItem.querySelector('.stat-item.like-stat');
            const gridDislikeStatItem = gridExtensionItem.querySelector('.stat-item.dislike-stat');
            gridLikeStatItem.querySelector('.stat-count').textContent = formatNumber(extension.likes);
            gridDislikeStatItem.querySelector('.stat-count').textContent = formatNumber(extension.dislikes);

            if (extension.userActions.liked) {
                gridLikeStatItem.classList.add('selected');
            } else {
                gridLikeStatItem.classList.remove('selected');
            }
            if (extension.userActions.disliked) {
                gridDislikeStatItem.classList.add('selected');
            } else {
                gridDislikeStatItem.classList.remove('selected');
            }
        }
    });

    // --- Core function to load extensions and populate the grid ---
    async function loadExtensions() {
        const listingsContainer = document.getElementById('extension-listings');
        listingsContainer.innerHTML = '<p style="text-align: center; color: var(--color-text-light);">Loading extensions...</p>';

        try {
            // 1. Fetch local extensions data (your extensions.json)
            const localExtensionsResponse = await fetch('extensions.json');
            if (!localExtensionsResponse.ok) {
                throw new Error(`HTTP error! status: ${localExtensionsResponse.status} from extensions.json`);
            }
            const localExtensions = await localExtensionsResponse.json();

            // 2. Fetch Firebase global stats and version info
            let firebaseExtensionsData = {};
            try {
                const snapshot = await get(child(dbRef, 'T4Studios/T4Extensions/Extension'));
                if (snapshot.exists()) {
                    firebaseExtensionsData = snapshot.val();
                }
            } catch (firebaseError) {
                console.warn("Firebase: Could not fetch global extension stats. Using defaults.", firebaseError);
                // Continue without Firebase data if there's an issue
            }

            // 3. Fetch user's individual actions
            let userActionsData = {};
            try {
                const userSnapshot = await get(child(dbRef, `T4Studios/UserActions/${hashedDeviceId}`));
                if (userSnapshot.exists()) {
                    userActionsData = userSnapshot.val();
                }
            } catch (userActionsError) {
                console.warn("Firebase: Could not fetch user actions. Using defaults.", userActionsError);
            }

            ALL_EXTENSIONS_DATA = []; // Reset global array

            for (const localExt of localExtensions) {
                const extId = localExt.id;
                const firebaseExt = firebaseExtensionsData[extId] || {}; // Get Firebase data for this extension
                const userExtActions = userActionsData[extId] || {}; // Get user's actions for this extension

                // Initialize counts with Firebase data, or 0 if not present
                let likes = firebaseExt.likes ? Object.keys(firebaseExt.likes.devices || {}).length : 0;
                let dislikes = firebaseExt.dislikes ? Object.keys(firebaseExt.dislikes.devices || {}).length : 0;
                let downloads = firebaseExt.downloads ? Object.keys(firebaseExt.downloads.devices || {}).length : 0;

                // Initialize user actions for the current device
                const userActions = {
                    liked: !!(firebaseExt.likes && firebaseExt.likes.devices && firebaseExt.likes.devices[hashedDeviceId]),
                    disliked: !!(firebaseExt.dislikes && firebaseExt.dislikes.devices && firebaseExt.dislikes.devices[hashedDeviceId]),
                    downloaded: !!(firebaseExt.downloads && firebaseExt.downloads.devices && firebaseExt.downloads.devices[hashedDeviceId]),
                    // Also check the specific userActions node if it exists (for consistency, though Firebase counts are primary)
                    likedUser: !!userExtActions.liked,
                    dislikedUser: !!userExtActions.disliked,
                    downloadedUser: !!userExtActions.downloaded
                };

                // --- Version Tracking Logic (NEW) ---
                const currentLatestVersion = Array.isArray(localExt.version) ? localExt.version[localExt.version.length - 1] : String(localExt.version || 'N/A');
                let versionLastChangeTimestamp = firebaseExt.versionInfo?.lastChangeTimestamp || new Date().toISOString(); // Default to now if not set
                let firebaseStoredVersion = firebaseExt.versionInfo?.latestVersionString;

                // Compare the latest version from local JSON with what's in Firebase
                if (currentLatestVersion !== firebaseStoredVersion) {
                    // Version has changed in extensions.json, update Firebase and reset timestamp
                    const newTimestamp = new Date().toISOString();
                    await set(child(dbRef, `T4Studios/T4Extensions/Extension/${extId}/versionInfo/latestVersionString`), currentLatestVersion);
                    await set(child(dbRef, `T4Studios/T4Extensions/Extension/${extId}/versionInfo/lastChangeTimestamp`), newTimestamp);
                    versionLastChangeTimestamp = newTimestamp; // Use the new timestamp
                    console.log(`Firebase: Version for extension ${localExt.name} updated from '${firebaseStoredVersion}' to '${currentLatestVersion}'. Timestamp reset to ${newTimestamp}.`);
                }
                // --- END Version Tracking Logic ---


                // Combine all data for this extension
                const combinedExtension = {
                    ...localExt,
                    likes: likes,
                    dislikes: dislikes,
                    downloads: downloads,
                    userActions: userActions,
                    versionLastChangeTimestamp: versionLastChangeTimestamp // Add the timestamp for display
                };
                ALL_EXTENSIONS_DATA.push(combinedExtension);
            }

            if (ALL_EXTENSIONS_DATA.length > 0) {
                listingsContainer.innerHTML = ''; // Clear loading message

                ALL_EXTENSIONS_DATA.forEach(extension => {
                    const extensionItem = document.createElement('div');
                    extensionItem.classList.add('extension-item');
                    extensionItem.dataset.extensionId = extension.id;

                    // Dynamically set background image
                    const headerVisualStyle = extension.bannerImage ? `background-image: url('${extension.bannerImage}');` : '';

                    // Generate status badges dynamically
                    const statusBadgesHtml = (extension.status || []).map(statusIndex => {
                        const statusMap = {
                            0: { class: 'status-none', text: 'None' }, // Changed class and text
                            1: { class: 'status-new', text: 'New!' },
                            2: { class: 'status-updated', text: 'Updated!' },
                            3: { class: 'status-broken', text: 'Broken!' },
                            4: { class: 'status-maintenance', text: 'Maint.' },
                            5: { class: 'status-beta', text: 'Beta!' }
                        };
                        const statusInfo = statusMap[statusIndex];
                        return statusInfo && statusInfo.text !== 'None' ? `<span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>` : '';
                    }).join('');

                    // Determine which date to display based on version count
                    const isSingleVersion = !Array.isArray(extension.version) || extension.version.length === 1;
                    const displayDate = isSingleVersion ? extension.releaseDate : extension.lastUpdated;
                    const displayDateLabel = isSingleVersion ? 'Release Date:' : 'Last Updated:';


                    extensionItem.innerHTML = `
                        <div class="extension-header-visual" style="${headerVisualStyle}">
                            <div class="extension-left-header-content">
                                <img src="${extension.iconImage}" alt="${extension.name} Icon" class="extension-icon" onerror="this.onerror=null;this.src='https://placehold.co/50x50/333333/FFFFFF?text=Icon';">
                                <div class="extension-status-badges">
                                    ${statusBadgesHtml}
                                </div>
                            </div>
                            <div class="extension-stats">
                                <div class="stat-item like-stat ${extension.userActions.liked ? 'selected' : ''}" data-stat-type="likes">
                                    <i class="material-icons like-icon">thumb_up</i>
                                    <span class="stat-count">${formatNumber(extension.likes)}</span>
                                </div>
                                <span class="pipe">|</span>
                                <div class="stat-item dislike-stat ${extension.userActions.disliked ? 'selected' : ''}" data-stat-type="dislikes">
                                    <i class="material-icons dislike-icon">thumb_down</i>
                                    <span class="stat-count">${formatNumber(extension.dislikes)}</span>
                                </div>
                                <span class="pipe">|</span>
                                <div class="stat-item download-stat ${extension.userActions.downloaded ? 'counted-once' : ''}">
                                    <i class="material-icons download-icon">download</i>
                                    <span class="stat-count">${formatNumber(extension.downloads)}</span>
                                </div>
                            </div>
                        </div>

                        <p class="extension-description">${extension.description}</p>
                        <div class="info-separator"></div>
                        <div class="meta-info-list">
                            <div class="extension-meta-bubbles">
                                <div class="info-bubble">
                                    <span class="label">Creator:</span> <span>${extension.creator}</span>
                                </div>
                                <div class="info-bubble">
                                    <span class="label">Version:</span> <span>${Array.isArray(extension.version) ? extension.version[extension.version.length - 1] : extension.version}</span>
                                </div>
                            </div>
                            <p>${displayDateLabel} <span>${displayDate}</span> <span class="time-ago">${formatTimeAgo(displayDate)}</span></p>
                        </div>
                    `;
                    listingsContainer.appendChild(extensionItem);

                    // Add click listener to open modal for each item
                    extensionItem.addEventListener('click', () => {
                        openExtensionDetailModal(extension);
                    });
                });

                // Attach event listeners for like/dislike/download on grid items
                // Use event delegation for efficiency
                listingsContainer.querySelectorAll('.stat-item.like-stat, .stat-item.dislike-stat').forEach(statItem => {
                    statItem.addEventListener('click', async (e) => {
                        e.stopPropagation(); // Prevent modal from opening
                        const extensionId = statItem.closest('.extension-item').dataset.extensionId;
                        const statType = statItem.dataset.statType; // 'likes' or 'dislikes'
                        const extension = ALL_EXTENSIONS_DATA.find(ext => ext.id === extensionId);

                        if (!extension) {
                            console.error('Extension data not found for stat update:', extensionId);
                            return; // showDownloadNotificationOverlay("Extension data not found.", "error"); // Removed for mini-stats clicks
                        }

                        let valueChange = 0;
                        if (statType === 'likes') {
                            const wasLiked = extension.userActions.liked;
                            const wasDisliked = extension.userActions.disliked;

                            if (wasLiked) {
                                await updateExtensionStatInFirebase(extensionId, 'likes', hashedDeviceId, false);
                                await updateUserActionInFirebase(extensionId, 'liked', hashedDeviceId, false);
                                extension.likes--;
                                extension.userActions.liked = false;
                                valueChange = -1;
                            } else {
                                await updateExtensionStatInFirebase(extensionId, 'likes', hashedDeviceId, true);
                                await updateUserActionInFirebase(extensionId, 'liked', hashedDeviceId, true);
                                extension.likes++;
                                extension.userActions.liked = true;
                                valueChange = 1;

                                if (wasDisliked) {
                                    await updateExtensionStatInFirebase(extensionId, 'dislikes', hashedDeviceId, false);
                                    await updateUserActionInFirebase(extensionId, 'disliked', hashedDeviceId, false);
                                    extension.dislikes--;
                                    extension.userActions.disliked = false;
                                }
                            }
                        } else if (statType === 'dislikes') {
                            const wasLiked = extension.userActions.liked;
                            const wasDisliked = extension.userActions.disliked;

                            if (wasDisliked) {
                                await updateExtensionStatInFirebase(extensionId, 'dislikes', hashedDeviceId, false);
                                await updateUserActionInFirebase(extensionId, 'disliked', hashedDeviceId, false);
                                extension.dislikes--;
                                extension.userActions.disliked = false;
                                valueChange = -1;
                            } else {
                                await updateExtensionStatInFirebase(extensionId, 'dislikes', hashedDeviceId, true);
                                await updateUserActionInFirebase(extensionId, 'disliked', hashedDeviceId, true);
                                extension.dislikes++;
                                extension.userActions.disliked = true;
                                valueChange = 1;

                                if (wasLiked) {
                                    await updateExtensionStatInFirebase(extensionId, 'likes', hashedDeviceId, false);
                                    await updateUserActionInFirebase(extensionId, 'liked', hashedDeviceId, false);
                                    extension.likes--;
                                    extension.userActions.liked = false;
                                }
                            }
                        }
                        
                        // Update UI for the clicked stat item
                        const statCountSpan = statItem.querySelector('.stat-count');
                        statCountSpan.textContent = formatNumber(extension[statType]);
                        if (statType === 'likes') {
                            if (extension.userActions.liked) statItem.classList.add('selected');
                            else statItem.classList.remove('selected');
                            // If dislike was also updated due to a like, update its UI too
                            const dislikeStatItem = statItem.parentNode.querySelector('.stat-item.dislike-stat');
                            if (dislikeStatItem) {
                                dislikeStatItem.querySelector('.stat-count').textContent = formatNumber(extension.dislikes);
                                if (extension.userActions.disliked) dislikeStatItem.classList.add('selected');
                                else dislikeStatItem.classList.remove('selected');
                            }
                        } else if (statType === 'dislikes') {
                            if (extension.userActions.disliked) statItem.classList.add('selected');
                            else statItem.classList.remove('selected');
                            // If like was also updated due to a dislike, update its UI too
                            const likeStatItem = statItem.parentNode.querySelector('.stat-item.like-stat');
                            if (likeStatItem) {
                                likeStatItem.querySelector('.stat-count').textContent = formatNumber(extension.likes);
                                if (extension.userActions.liked) likeStatItem.classList.add('selected');
                                else likeStatItem.classList.remove('selected');
                            }
                        }
                        
                        // Animate the change
                        if (valueChange !== 0) {
                            animateStatChange(statItem, valueChange > 0 ? '+1' : '-1');
                        }
                    });
                });

                // Attach click listener for download stat on grid item (opens modal)
                listingsContainer.querySelectorAll('.stat-item.download-stat').forEach(statItem => {
                    statItem.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent modal from opening
                        // This stat item is only for display, actual download logic is in the modal.
                        // However, if they click it, still open the modal for full details.
                        const extensionId = statItem.closest('.extension-item').dataset.extensionId;
                        const extension = ALL_EXTENSIONS_DATA.find(ext => ext.id === extensionId);
                        if (extension) {
                            openExtensionDetailModal(extension);
                        }
                    });
                });
            } else {
                listingsContainer.innerHTML = '<p style="text-align: center; color: var(--color-text-light);">No extensions found.</p>';
            }

        } catch (error) {
            console.error('Error loading extensions:', error);
            const listingsContainer = document.getElementById('extension-listings');
            listingsContainer.innerHTML = '<p style="text-align: center; color: var(--color-notification-error-border);">Failed to load extensions. Please try again later.</p>';
            showDownloadNotificationOverlay("Failed to load extensions.", "error");
        }
    }

    // Toggle description section
    const descriptionSection = document.getElementById('description-section');
    const descriptionArrow = document.getElementById('description-arrow');
    const descriptionToggle = document.getElementById('description-toggle');

    descriptionToggle.addEventListener('click', () => {
        descriptionSection.classList.toggle('hidden');
        descriptionArrow.classList.toggle('rotated');
    });

    // Initial load of extensions
    loadExtensions();
});

// Status Moderation:
// 0 = None, 1 = NEW!, 2 = UPDATED!, 3 = BROKEN!, 4 = MAINTENCE!, 5 = BETA!