let lastFocusedElement = null;

// Track the last editable element the user focused
document.addEventListener("focusin", (event) => {
    const el = event.target;
    if (!el) return;

    if (isEditable(el)) {
        lastFocusedElement = el;
    }
});

// Handle messages from the popup or background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action !== "injectPrompt") {
        sendResponse({ ok: false, reason: "unknown action" });
        return false;
    }

    const target =
        document.activeElement && isEditable(document.activeElement)
            ? document.activeElement
            : lastFocusedElement;

    if (!target) {
        sendResponse({ ok: false, reason: "no focused text field" });
        return false;
    }

    try {
        insertPrompt(target, message.prompt);
        sendResponse({ ok: true });
    } catch (err) {
        sendResponse({ ok: false, reason: String(err) });
    }

    return false; // synchronous response — no need to keep the port open
});

function isEditable(el) {
    if (!el || !el.tagName) return false;

    const tag = el.tagName;

    if (tag === "TEXTAREA") return true;

    if (tag === "INPUT") {
        const type = (el.type || "").toLowerCase();
        return [
            "text", "search", "email", "url",
            "tel", "password", "number", ""
        ].includes(type);
    }

    return el.isContentEditable === true;
}

function insertPrompt(element, prompt) {
    if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
        const start = element.selectionStart ?? element.value.length;
        const end = element.selectionEnd ?? element.value.length;
        const currentText = element.value;

        element.value =
            currentText.substring(0, start) +
            prompt +
            currentText.substring(end);

        element.selectionStart = element.selectionEnd = start + prompt.length;

        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (element.isContentEditable) {
        element.focus();

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode(prompt);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            // Fallback: append to the end of the editable element
            element.textContent += prompt;
        }

        element.dispatchEvent(new InputEvent("input", {
            bubbles: true,
            inputType: "insertText",
            data: prompt
        }));
    }
}