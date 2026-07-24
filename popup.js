const btn = document.getElementById("toggleBtn");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");

let enabled = false;

function updateButton() {
    if (!btn) return;

    btn.textContent = enabled ? "⛔ Stop Inspect" : "▶ Start Inspect";

    if (statusDot) {
        statusDot.classList.toggle("active", enabled);
    }

    if (statusText) {
        statusText.textContent = enabled ? "Inspector Active" : "Inspector Disabled";
    }
}

chrome.storage.local.get(["enabled"], (result) => {
    enabled = Boolean(result.enabled);
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

    if (!enabled) {
        await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ["content.css"]
        });

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"]
        });
    }

    await chrome.tabs.sendMessage(tab.id, {
        action: enabled ? "disable" : "enable"
    });

    enabled = !enabled;
    chrome.storage.local.set({ enabled });
    updateButton();
});