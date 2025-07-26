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
    const modalBannerThumbnail = document.getElementById('modal-banner-thumbnail'); // New
    const modalDescription = document.getElementById('modal-description');
    const modalCreator = document.getElementById('modal-creator');
    const modalReleaseDate = document.getElementById('modal-release-date');
    const modalVersion = document.getElementById('modal-version');
    const modalLastUpdated = document.getElementById('modal-last-updated');
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
        modalBannerThumbnail.src = extensionData.bannerImage || 'assets/textures/extensions/banner/default_banner.png'; // Set thumbnail
        modalDescription.textContent = extensionData.longDescription || extensionData.description || 'No detailed description available.';
        modalCreator.textContent = extensionData.creator || 'N/A';
        modalReleaseDate.textContent = extensionData.releaseDate || 'N/A';
        modalVersion.textContent = extensionData.version || 'N/A';
        modalLastUpdated.textContent = extensionData.lastUpdated || 'N/A';

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
                modalDislikeStatItem.classList.remove('selected');
                modalDislikeButton.classList.remove('selected');
                animateStatChange(modalDislikeStatItem, '-1');
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
                modalLikeStatItem.classList.remove('selected');
                modalLikeButton.classList.remove('selected');
                animateStatChange(modalLikeStatItem, '-1');
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


    let ALL_EXTENSIONS_DATA = []; // Store the fetched and processed extensions globally

    // --- Main Extension Loading and Interaction Logic ---
    async function loadExtensions() {
        try {
            // 1. Fetch extensions.json from the server
            const response = await fetch('extensions.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const jsonExtensions = await response.json();

            // 2. Fetch dynamic global stats (device lists for counts) from Firebase Realtime Database
            const firebaseStatsSnapshot = await get(child(dbRef, 'T4Studios/T4Extensions/Extension/'));
            const firebaseGlobalStats = firebaseStatsSnapshot.exists() ? firebaseStatsSnapshot.val() : {};

            // 3. Fetch current user's specific actions from Firebase Realtime Database
            const userActionsSnapshot = await get(child(dbRef, `T4Studios/UserActions/${hashedDeviceId}`));
            const currentUserActions = userActionsSnapshot.exists() ? userActionsSnapshot.val() : {};

            // 4. Combine data: Use static info from JSON, global counts & user's status from Firebase
            ALL_EXTENSIONS_DATA = jsonExtensions.map(ext => { // Assign to global variable
                const globalExtStats = firebaseGlobalStats[ext.id] || {};
                const userExtActions = currentUserActions[ext.id] || {};

                const likesCount = globalExtStats.likes && globalExtStats.likes.devices ? Object.keys(globalExtStats.likes.devices).length : 0;
                const dislikesCount = globalExtStats.dislikes && globalExtStats.dislikes.devices ? Object.keys(globalExtStats.dislikes.devices).length : 0;
                const downloadsCount = globalExtStats.downloads && globalExtStats.downloads.devices ? Object.keys(globalExtStats.downloads.devices).length : 0;

                return {
                    ...ext,
                    likes: likesCount, // Store raw numbers
                    dislikes: dislikesCount, // Store raw numbers
                    downloads: downloadsCount, // Store raw numbers
                    userActions: {
                        liked: userExtActions.liked === true,
                        disliked: userExtActions.disliked === true,
                        downloaded: userExtActions.downloaded === true
                    }
                };
            });

            const listingsContainer = document.getElementById('extension-listings');
            listingsContainer.innerHTML = '';

            if (ALL_EXTENSIONS_DATA && ALL_EXTENSIONS_DATA.length > 0) {
                ALL_EXTENSIONS_DATA.forEach(extension => {
                    const extensionId = extension.id;

                    // Format numbers for display
                    const displayLikes = formatNumber(extension.likes);
                    const displayDislikes = formatNumber(extension.dislikes);
                    const displayDownloads = formatNumber(extension.downloads);

                    const isLikedSelected = extension.userActions.liked;
                    const isDislikedSelected = extension.userActions.disliked;
                    const isDownloadedOnce = extension.userActions.downloaded;

                    // Use extension.bannerImage for the background, with a fallback
                    const headerVisualStyle = `background-image: url('${extension.bannerImage || 'assets/textures/extensions/banner/default_banner.png'}');`;
                    // Use extension.iconImage for the icon, with a fallback
                    const iconImageSrc = extension.iconImage || 'assets/textures/extensions/icon/default_icon.png';

                    let statusBadgesHtml = ''; // Initialize as empty string to build multiple badges
                    // Ensure extension.status is always treated as an array for iteration
                    const statuses = Array.isArray(extension.status) ? extension.status : [extension.status]; 
                    
                    statuses.forEach(statusNum => {
                        let statusClass = '';
                        let statusText = '';
                        switch (statusNum) {
                            case 1:
                                statusClass = 'status-new';
                                statusText = 'NEW!';
                                break;
                            case 2:
                                statusClass = 'status-updated';
                                statusText = 'UPDATED!';
                                break;
                            case 3:
                                statusClass = 'status-outdated';
                                statusText = 'OUTDATED!';
                                break;
                            case 4:
                                statusClass = 'status-maintenance';
                                statusText = 'MAINTENANCE!';
                                break;
                            case 5:
                                statusClass = 'status-development';
                                statusText = 'DEVELOPMENT!';
                                break;
                            case 0:
                            default:
                                // No badge for status 0 or unrecognized status
                                return;
                        }
                        if (statusClass) {
                            statusBadgesHtml += `<span class="status-badge ${statusClass}">${statusText}</span>`;
                        }
                    });

                    const extensionItem = document.createElement('div');
                    extensionItem.classList.add('extension-item');
                    extensionItem.dataset.extensionId = extensionId; // Set data attribute for easy lookup

                    extensionItem.innerHTML = `
                        <div class="extension-header-visual" style="${headerVisualStyle}">
                            <div class="extension-left-header-content">
                                <img src="${iconImageSrc}" alt="${extension.name} Icon" class="extension-icon" onerror="this.onerror=null;this.src='https://placehold.co/50x50/333333/FFFFFF?text=Icon';">
                                <div class="extension-status-badges">
                                    ${statusBadgesHtml}
                                </div>
                            </div>
                            <div class="extension-stats">
                                <div class="stat-item like-stat ${isLikedSelected ? 'selected' : ''}" data-stat-type="likes">
                                    <i class="material-icons like-icon">thumb_up</i>
                                    <span class="stat-count">${displayLikes}</span>
                                </div>
                                <span class="pipe">|</span>
                                <div class="stat-item dislike-stat ${isDislikedSelected ? 'selected' : ''}" data-stat-type="dislikes">
                                    <i class="material-icons dislike-icon">thumb_down</i>
                                    <span class="stat-count">${displayDislikes}</span>
                                </div>
                                <span class="pipe">|</span>
                                <div class="stat-item download-stat ${isDownloadedOnce ? 'counted-once' : ''}">
                                    <i class="material-icons download-icon">download</i>
                                    <span class="stat-count">${displayDownloads}</span>
                                </div>
                            </div>
                        </div>
                        <p class="extension-description">${extension.description}</p>
                        <div class="meta-info-list">
                            <div class="extension-meta-bubbles">
                                <div class="info-bubble creator-bubble">
                                    <span class="label">Creator:</span> <span>${extension.creator || 'N/A'}</span>
                                </div>
                                <div class="info-bubble version-bubble">
                                    <span class="label">Version:</span> <span>${extension.version || 'N/A'}</span>
                                </div>
                            </div>
                            <div class="info-separator"></div>
                            <p>Last Updated: <span>${extension.lastUpdated || 'N/A'}</span></p>
                        </div>
                    `;
                    listingsContainer.appendChild(extensionItem);

                    // Add click listener to open modal
                    extensionItem.addEventListener('click', () => {
                        openExtensionDetailModal(extension);
                    });

                    // Add click listeners for like/dislike/download actions on the grid items
                    const likeStatItem = extensionItem.querySelector('.stat-item.like-stat');
                    const dislikeStatItem = extensionItem.querySelector('.stat-item.dislike-stat');
                    const downloadStatItem = extensionItem.querySelector('.stat-item.download-stat');

                    // Handle Like/Dislike Clicks on grid items
                    likeStatItem.addEventListener('click', async (e) => {
                        e.stopPropagation(); // Prevent modal from opening

                        if (extension.userActions.liked) {
                            // If already liked, unlike it
                            await updateExtensionStatInFirebase(extensionId, 'likes', hashedDeviceId, false);
                            await updateUserActionInFirebase(extensionId, 'liked', hashedDeviceId, false);
                            extension.likes--;
                            extension.userActions.liked = false;
                            likeStatItem.classList.remove('selected');
                            animateStatChange(likeStatItem, '-1');
                        } else {
                            // If not liked, like it
                            await updateExtensionStatInFirebase(extensionId, 'likes', hashedDeviceId, true);
                            await updateUserActionInFirebase(extensionId, 'liked', hashedDeviceId, true);
                            extension.likes++;
                            extension.userActions.liked = true;
                            likeStatItem.classList.add('selected');
                            animateStatChange(likeStatItem, '+1');

                            // If previously disliked, un-dislike it
                            if (extension.userActions.disliked) {
                                await updateExtensionStatInFirebase(extensionId, 'dislikes', hashedDeviceId, false);
                                await updateUserActionInFirebase(extensionId, 'disliked', hashedDeviceId, false);
                                extension.dislikes--;
                                extension.userActions.disliked = false;
                                dislikeStatItem.classList.remove('selected');
                                animateStatChange(dislikeStatItem, '-1');
                            }
                        }
                        likeStatItem.querySelector('.stat-count').textContent = formatNumber(extension.likes);
                        dislikeStatItem.querySelector('.stat-count').textContent = formatNumber(extension.dislikes); // Update dislike count too
                    });

                    dislikeStatItem.addEventListener('click', async (e) => {
                        e.stopPropagation(); // Prevent modal from opening

                        if (extension.userActions.disliked) {
                            // If already disliked, un-dislike it
                            await updateExtensionStatInFirebase(extensionId, 'dislikes', hashedDeviceId, false);
                            await updateUserActionInFirebase(extensionId, 'disliked', hashedDeviceId, false);
                            extension.dislikes--;
                            extension.userActions.disliked = false;
                            dislikeStatItem.classList.remove('selected');
                            animateStatChange(dislikeStatItem, '-1');
                        } else {
                            // If not disliked, dislike it
                            await updateExtensionStatInFirebase(extensionId, 'dislikes', hashedDeviceId, true);
                            await updateUserActionInFirebase(extensionId, 'disliked', hashedDeviceId, true);
                            extension.dislikes++;
                            extension.userActions.disliked = true;
                            dislikeStatItem.classList.add('selected');
                            animateStatChange(dislikeStatItem, '+1');

                            // If previously liked, un-like it
                            if (extension.userActions.liked) {
                                await updateExtensionStatInFirebase(extensionId, 'likes', hashedDeviceId, false);
                                await updateUserActionInFirebase(extensionId, 'liked', hashedDeviceId, false);
                                extension.likes--;
                                extension.userActions.liked = false;
                                likeStatItem.classList.remove('selected');
                                animateStatChange(likeStatItem, '-1');
                            }
                        }
                        dislikeStatItem.querySelector('.stat-count').textContent = formatNumber(extension.dislikes);
                        likeStatItem.querySelector('.stat-count').textContent = formatNumber(extension.likes); // Update like count too
                    });

                    // Download stat is not directly clickable for incrementing in the grid
                    downloadStatItem.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent modal from opening
                        // This stat item is only for display, actual download logic is in the modal.
                        // However, if they click it, still open the modal for full details.
                        openExtensionDetailModal(extension);
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