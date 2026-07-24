let enabled = false;
let isFrozen = false;
let currentElement = null;
let inspectorPanel = null;
let dragState = null;
let panelInteractionsReady = false;

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