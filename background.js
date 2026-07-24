// CSS Inspector Pro
// background.js

chrome.runtime.onInstalled.addListener(() => {
    console.log("✅ CSS Inspector Pro Installed");
});

// Optional: Handle extension icon click (for future features)
chrome.action.onClicked.addListener((tab) => {
    console.log("Extension clicked on:", tab.url);
});

// Listen for messages from popup/content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    switch (request.action) {

        case "enable":
            console.log("Inspector Enabled");
            break;

        case "disable":
            console.log("Inspector Disabled");
            break;

        case "copy":
            console.log("Copy requested");
            break;

        default:
            break;
    }

    sendResponse({
        success: true
    });

    return true;
});