let enabled = false;
let isFrozen = false;
let currentElement = null;
let inspectorPanel = null;
let dragState = null;
let panelInteractionsReady = false;
let tagLabelsEnabled = false;
let showOnlyFontTags = false;
let tagLabelLayer = null;
let tagLabelObserver = null;
let tagRenderFrame = 0;
let tagRenderScheduled = false;

const EXCLUDED_TAGS = new Set(["HTML", "HEAD", "BODY", "SCRIPT", "STYLE", "LINK", "META", "TITLE"]);
const FONT_TAGS = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "SPAN", "A", "STRONG", "EM", "LABEL", "BUTTON"]);
const MAX_TAG_LABELS = 220;

function clearHighlight() {
    if (currentElement) {
        currentElement.classList.remove("cssInspectorHighlight", "css-highlight", "cssInspectorSelected");
    }
    currentElement = null;
    isFrozen = false;
}

function removePanel() {
    if (inspectorPanel) {
        inspectorPanel.remove();
        inspectorPanel = null;
        panelInteractionsReady = false;
    }
}

function updateFreezeButton() {
    const freezeButton = inspectorPanel?.querySelector("#cssInspectorFreeze");
    if (freezeButton) {
        freezeButton.textContent = isFrozen ? "☑" : "❄";
        freezeButton.title = isFrozen ? "Unfreeze selection" : "Freeze selection";
    }
}

function applyElementHighlight(element, frozen) {
    if (currentElement && currentElement !== element) {
        currentElement.classList.remove("cssInspectorHighlight", "css-highlight", "cssInspectorSelected");
    }

    currentElement = element;

    if (element) {
        element.classList.remove("cssInspectorHighlight", "css-highlight", "cssInspectorSelected");
        if (frozen) {
            element.classList.add("cssInspectorSelected");
        } else {
            element.classList.add("cssInspectorHighlight", "css-highlight");
        }
    }
}

function showCSS(element) {
    const css = getComputedStyle(element);

    if (!inspectorPanel) {
        inspectorPanel = document.createElement("div");
        inspectorPanel.id = "cssInspectorPanel";
        inspectorPanel.innerHTML = `
            <div id="cssInspectorHeader">
                <div id="cssInspectorTitle">CSS Inspector</div>
                <div id="cssInspectorControls">
                    <button id="cssInspectorFreeze" type="button" title="Freeze selection">❄</button>
                    <button id="cssInspectorClose" type="button" title="Close inspector">×</button>
                </div>
            </div>
            <div id="cssInspectorBody"></div>
        `;
        document.body.appendChild(inspectorPanel);

        const closeButton = inspectorPanel.querySelector("#cssInspectorClose");
        closeButton?.addEventListener("click", () => {
            disableInspector();
        });

        const freezeButton = inspectorPanel.querySelector("#cssInspectorFreeze");
        freezeButton?.addEventListener("click", (event) => {
            event.stopPropagation();
            if (!currentElement) return;
            isFrozen = !isFrozen;
            applyElementHighlight(currentElement, isFrozen);
            updateFreezeButton();
            showCSS(currentElement);
        });

        const header = inspectorPanel.querySelector("#cssInspectorHeader");
        header?.addEventListener("mousedown", startPanelDrag);

        panelInteractionsReady = true;
    }

    updateFreezeButton();

    const body = inspectorPanel.querySelector("#cssInspectorBody");
    if (body) {
        body.innerHTML = `
            <div class="css-section">
                <div class="css-heading">Element</div>
                <div class="css-row"><span class="css-label">Tag</span><span class="css-value">${element.tagName}</span></div>
                <div class="css-row"><span class="css-label">ID</span><span class="css-value">${element.id || "—"}</span></div>
                <div class="css-row"><span class="css-label">Classes</span><span class="css-value">${element.className || "—"}</span></div>
            </div>
            <div class="css-section">
                <div class="css-heading">Typography</div>
                <div class="css-row"><span class="css-label">Font</span><span class="css-value">${css.fontFamily}</span></div>
                <div class="css-row"><span class="css-label">Font Size</span><span class="css-value">${css.fontSize}</span></div>
                <div class="css-row"><span class="css-label">Font Weight</span><span class="css-value">${css.fontWeight}</span></div>
                <div class="css-row"><span class="css-label">Line Height</span><span class="css-value">${css.lineHeight}</span></div>
            </div>
            <div class="css-section">
                <div class="css-heading">Box</div>
                <div class="css-row"><span class="css-label">Width</span><span class="css-value">${css.width}</span></div>
                <div class="css-row"><span class="css-label">Height</span><span class="css-value">${css.height}</span></div>
                <div class="css-row"><span class="css-label">Margin</span><span class="css-value">${css.margin}</span></div>
                <div class="css-row"><span class="css-label">Padding</span><span class="css-value">${css.padding}</span></div>
                <div class="css-row"><span class="css-label">Border</span><span class="css-value">${css.border}</span></div>
            </div>
            <div class="css-section">
                <div class="css-heading">Colors</div>
                <div class="css-row"><span class="css-label">Text Color</span><span class="css-value">${css.color}</span></div>
                <div class="css-row"><span class="css-label">Background</span><span class="css-value">${css.backgroundColor}</span></div>
            </div>
        `;
    }
}

function createTagLabel(element) {
    if (!(element instanceof Element)) return null;
    if (EXCLUDED_TAGS.has(element.tagName) || element.closest("#cssInspectorPanel") || element.closest(".css-tag-label")) {
        return null;
    }

    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    if (!rect || (rect.width < 2 && rect.height < 2) || style.display === "none" || style.visibility === "hidden") {
        return null;
    }

    const label = document.createElement("div");
    label.className = "css-tag-label";
    label.textContent = `${element.tagName.toLowerCase()} · ${style.fontSize}`;
    label.style.left = `${rect.left}px`;
    label.style.top = `${rect.top}px`;
    return label;
}

function scheduleTagLabelRender() {
    if (!tagLabelsEnabled || tagRenderScheduled) return;

    tagRenderScheduled = true;
    tagRenderFrame = window.requestAnimationFrame(() => {
        tagRenderScheduled = false;
        renderTagLabels();
    });
}

function cancelTagLabelRender() {
    if (tagRenderFrame) {
        window.cancelAnimationFrame(tagRenderFrame);
    }
    tagRenderFrame = 0;
    tagRenderScheduled = false;
}

function shouldShowTagLabel(element) {
    if (!(element instanceof Element)) return false;
    if (EXCLUDED_TAGS.has(element.tagName)) return false;
    if (element.closest("#cssInspectorPanel")) return false;
    if (element.closest(".css-tag-label")) return false;

    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    if (rect.width < 2 && rect.height < 2) return false;
    if (style.display === "none" || style.visibility === "hidden") return false;

    if (!showOnlyFontTags) return true;

    return FONT_TAGS.has(element.tagName);
}

function renderTagLabels() {
    if (!tagLabelsEnabled) return;

    if (!tagLabelLayer) {
        tagLabelLayer = document.createElement("div");
        tagLabelLayer.id = "cssTagLabelLayer";
        document.body?.appendChild(tagLabelLayer);
    }

    tagLabelLayer.innerHTML = "";
    const elements = Array.from(document.querySelectorAll("*"))
        .filter((element) => shouldShowTagLabel(element))
        .slice(0, MAX_TAG_LABELS);

    elements.forEach((element) => {
        const label = createTagLabel(element);
        if (label) {
            tagLabelLayer.appendChild(label);
        }
    });
}

function attachTagLabelObserver() {
    if (tagLabelObserver || !document.documentElement) return;

    tagLabelObserver = new MutationObserver(() => {
        if (tagLabelsEnabled) {
            scheduleTagLabelRender();
        }
    });

    tagLabelObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
}

function detachTagLabelObserver() {
    tagLabelObserver?.disconnect();
    tagLabelObserver = null;
}

function attachTagLabelEvents() {
    window.addEventListener("scroll", scheduleTagLabelRender, true);
    window.addEventListener("resize", scheduleTagLabelRender);
    attachTagLabelObserver();
}

function detachTagLabelEvents() {
    window.removeEventListener("scroll", scheduleTagLabelRender, true);
    window.removeEventListener("resize", scheduleTagLabelRender);
    detachTagLabelObserver();
}

function showTagLabels() {
    if (tagLabelsEnabled) return;

    tagLabelsEnabled = true;
    attachTagLabelEvents();
    scheduleTagLabelRender();
}

function hideTagLabels() {
    if (!tagLabelsEnabled) return;

    tagLabelsEnabled = false;
    cancelTagLabelRender();
    detachTagLabelEvents();
    tagLabelLayer?.remove();
    tagLabelLayer = null;
}

function toggleTagLabels() {
    if (tagLabelsEnabled) {
        hideTagLabels();
    } else {
        showTagLabels();
    }
}

function handleMouseMove(event) {
    if (!enabled || isFrozen) return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest("#cssInspectorPanel")) return;

    applyElementHighlight(target, false);
    showCSS(target);
}

function handleClick(event) {
    if (!enabled) return;

    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("#cssInspectorPanel")) return;

    event.preventDefault();
    event.stopPropagation();

    isFrozen = true;
    applyElementHighlight(target, true);
    showCSS(target);
}

function handleKeydown(event) {
    if (event.key === "Escape") {
        disableInspector();
    }
}

function startPanelDrag(event) {
    if (!inspectorPanel || event.button !== 0) return;

    event.preventDefault();
    dragState = {
        startX: event.clientX,
        startY: event.clientY,
        startLeft: inspectorPanel.offsetLeft,
        startTop: inspectorPanel.offsetTop
    };

    document.addEventListener("mousemove", handlePanelDrag);
    document.addEventListener("mouseup", stopPanelDrag);
}

function handlePanelDrag(event) {
    if (!dragState || !inspectorPanel) return;

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    const nextLeft = Math.max(0, Math.min(window.innerWidth - inspectorPanel.offsetWidth, dragState.startLeft + deltaX));
    const nextTop = Math.max(0, Math.min(window.innerHeight - inspectorPanel.offsetHeight, dragState.startTop + deltaY));

    inspectorPanel.style.left = `${nextLeft}px`;
    inspectorPanel.style.top = `${nextTop}px`;
    inspectorPanel.style.right = "auto";
}

function stopPanelDrag() {
    dragState = null;
    document.removeEventListener("mousemove", handlePanelDrag);
    document.removeEventListener("mouseup", stopPanelDrag);
}

function attachInspectorEvents() {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleKeydown);
}

function detachInspectorEvents() {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("keydown", handleKeydown);
    document.removeEventListener("mousemove", handlePanelDrag);
    document.removeEventListener("mouseup", stopPanelDrag);
}

function disableInspector() {
    enabled = false;
    clearHighlight();
    removePanel();
    detachInspectorEvents();
}

function enableInspector() {
    enabled = true;
    isFrozen = false;
    attachInspectorEvents();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "enable") {
        enableInspector();
    } else if (request.action === "disable") {
        disableInspector();
    } else if (request.action === "showTagLabels") {
        showTagLabels();
    } else if (request.action === "hideTagLabels") {
        hideTagLabels();
    } else if (request.action === "toggleTagLabels") {
        toggleTagLabels();
    } else if (request.action === "setTagFilter") {
        showOnlyFontTags = Boolean(request.showOnlyFontTags);
        if (tagLabelsEnabled) {
            scheduleTagLabelRender();
        }
    } else if (request.action === "ping") {
        sendResponse({ success: true });
        return true;
    }

    sendResponse({ success: true });
    return true;
});

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        disableInspector();
    });
} else {
    disableInspector();
}