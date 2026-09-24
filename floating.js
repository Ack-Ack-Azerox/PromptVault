let pvButton = null;
let pvMenu = null;
let currentElement = null;

document.addEventListener("focusin", (e) => {
    if (!isEditable(e.target)) return;

    currentElement = e.target;
    createButton();
    updateButtonPosition();
});

document.addEventListener("input", (e) => {
    if (!isEditable(e.target)) return;

    currentElement = e.target;
    createButton();
    updateButtonPosition();
});

document.addEventListener("click", (e) => {
    if (
        pvMenu &&
        !pvMenu.contains(e.target) &&
        e.target !== pvButton
    ) {
        pvMenu.remove();
        pvMenu = null;
    }
});

function isEditable(el) {
    if (!el) return false;

    if (el.tagName === "TEXTAREA") return true;

    if (el.tagName === "INPUT") {
        return [
            "text",
            "search",
            "email",
            "url",
            "tel",
            "password"
        ].includes((el.type || "").toLowerCase());
    }

    return el.isContentEditable;
}

function createButton() {

    if (pvButton) return;

    pvButton = document.createElement("div");
    pvButton.id = "promptvault-float-btn";

    pvButton.innerHTML = `
        <img src="${chrome.runtime.getURL("icons/icon48.png")}" />
    `;

    document.body.appendChild(pvButton);

    pvButton.addEventListener("click", openPromptMenu);
}

function updateButtonPosition() {

    if (!currentElement || !pvButton) return;

    try {

        if (currentElement.isContentEditable) {

            const selection = window.getSelection();

            if (
                selection &&
                selection.rangeCount > 0
            ) {

                const range =
                    selection.getRangeAt(0);

                const rect =
                    range.getBoundingClientRect();

                pvButton.style.left =
                    rect.right + 8 + "px";

                pvButton.style.top =
                    rect.top - 5 + "px";

                return;
            }
        }

        const rect =
            currentElement.getBoundingClientRect();

        pvButton.style.left =
            rect.right - 45 + "px";

        pvButton.style.top =
            rect.bottom - 45 + "px";

    } catch (err) {
        console.error(err);
    }
}

async function openPromptMenu() {

    if (pvMenu) {
        pvMenu.remove();
        pvMenu = null;
        return;
    }

    const data =
        await chrome.storage.local.get(["prompts"]);

    const prompts =
        data.prompts || [];

    pvMenu =
        document.createElement("div");

    pvMenu.id =
        "promptvault-menu";

    let html = `
        <div class="pv-header">
            PromptVault
        </div>
    `;

    if (prompts.length === 0) {

        html += `
            <div class="pv-empty">
                No prompts saved
            </div>
        `;

    } else {

        prompts.forEach((prompt, index) => {

            html += `
                <div
                    class="pv-item"
                    data-index="${index}"
                >
                    ${prompt.title}
                </div>
            `;
        });
    }

    pvMenu.innerHTML = html;

    document.body.appendChild(pvMenu);

    const rect =
        pvButton.getBoundingClientRect();

    pvMenu.style.left =
        rect.left + "px";

    pvMenu.style.top =
        rect.bottom + 10 + "px";

    pvMenu
        .querySelectorAll(".pv-item")
        .forEach(item => {

            item.addEventListener(
                "click",
                async () => {

                    const index =
                        parseInt(
                            item.dataset.index
                        );

                    const data =
                        await chrome.storage.local.get(
                            ["prompts"]
                        );

                    const prompt =
                        data.prompts[index];

                    if (prompt) {
                        insertPrompt(
                            prompt.body
                        );
                    }

                    pvMenu.remove();
                    pvMenu = null;
                }
            );
        });
}

function insertPrompt(text) {

    if (!currentElement) return;

    if (
        currentElement.tagName === "TEXTAREA" ||
        currentElement.tagName === "INPUT"
    ) {

        const start =
            currentElement.selectionStart;

        const end =
            currentElement.selectionEnd;

        currentElement.value =
            currentElement.value.substring(
                0,
                start
            ) +
            text +
            currentElement.value.substring(
                end
            );

        currentElement.dispatchEvent(
            new Event(
                "input",
                { bubbles: true }
            )
        );

        return;
    }

    if (
        currentElement.isContentEditable
    ) {

        const selection =
            window.getSelection();

        if (
            selection &&
            selection.rangeCount
        ) {

            const range =
                selection.getRangeAt(0);

            range.deleteContents();

            const node =
                document.createTextNode(
                    text
                );

            range.insertNode(node);

            range.setStartAfter(node);
            range.setEndAfter(node);

            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
}