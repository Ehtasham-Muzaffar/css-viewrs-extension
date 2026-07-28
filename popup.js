const btn = document.getElementById("toggleBtn");
const tagToggleBtn = document.getElementById("tagToggleBtn");
const fontTagsOnlyCheckbox = document.getElementById("fontTagsOnlyCheckbox");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");

let enabled = false;
let tagLabelsEnabled = false;
let showOnlyFontTags = false;

function updateButton() {
    if (!btn) return;

    btn.textContent = enabled ? "⛔ Stop Inspect" : "▶ Start Inspect";

    if (tagToggleBtn) {
        tagToggleBtn.textContent = tagLabelsEnabled ? "🙈 Hide Tag Labels" : "🏷️ Show Tag Labels";
    }

    if (fontTagsOnlyCheckbox) {
        fontTagsOnlyCheckbox.checked = showOnlyFontTags;
    }

    if (statusDot) {
        statusDot.classList.toggle("active", enabled);
    }

    if (statusText) {
        statusText.textContent = enabled ? "Inspector Active" : "Inspector Disabled";
    }
}

function sendToTab(tabId, message) {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, message, () => {
            const error = chrome.runtime.lastError;
            resolve(!error);
        });
    });
}

async function ensureContentReady(tabId) {
    const isReady = await sendToTab(tabId, { action: "ping" });

    if (isReady) {
        return;
    }

    await chrome.scripting.insertCSS({
        target: { tabId },
        files: ["content.css"]
    });

    await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"]
    });

    await new Promise((resolve) => setTimeout(resolve, 120));
}

chrome.storage.local.get(["enabled", "tagLabelsEnabled", "showOnlyFontTags"], (result) => {
    enabled = Boolean(result.enabled);
    tagLabelsEnabled = Boolean(result.tagLabelsEnabled);
    showOnlyFontTags = Boolean(result.showOnlyFontTags);
    updateButton();
});

btn?.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    if (!tab?.id) {
        return;
    }

    await ensureContentReady(tab.id);

    await chrome.tabs.sendMessage(tab.id, {
        action: enabled ? "disable" : "enable"
    });

    enabled = !enabled;
    chrome.storage.local.set({ enabled, tagLabelsEnabled, showOnlyFontTags });
    updateButton();
});

tagToggleBtn?.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    if (!tab?.id) {
        return;
    }

    await ensureContentReady(tab.id);

    await chrome.tabs.sendMessage(tab.id, {
        action: tagLabelsEnabled ? "hideTagLabels" : "showTagLabels"
    });

    tagLabelsEnabled = !tagLabelsEnabled;
    chrome.storage.local.set({ enabled, tagLabelsEnabled, showOnlyFontTags });
    updateButton();
});

fontTagsOnlyCheckbox?.addEventListener("change", async () => {
    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    if (!tab?.id) {
        return;
    }

    await ensureContentReady(tab.id);

    showOnlyFontTags = fontTagsOnlyCheckbox.checked;
    await chrome.tabs.sendMessage(tab.id, {
        action: "setTagFilter",
        showOnlyFontTags
    });

    chrome.storage.local.set({ enabled, tagLabelsEnabled, showOnlyFontTags });
    updateButton();
});