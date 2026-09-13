const titleInput = document.getElementById("title");
const bodyInput = document.getElementById("body");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const promptList = document.getElementById("promptList");

let editingIndex = -1;

// Load on open
loadPrompts();

// Save / update
saveBtn.addEventListener("click", async () => {
    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();

    if (title === "" || body === "") {
        alert("Please enter both title and prompt.");
        return;
    }

    const data = await chrome.storage.local.get(["prompts"]);
    let prompts = data.prompts || [];

    const newPrompt = { title, body };

    if (editingIndex === -1) {
        prompts.push(newPrompt);
    } else {
        prompts[editingIndex] = newPrompt;
    }

    await chrome.storage.local.set({ prompts });

    resetForm();
    loadPrompts();
});

cancelBtn.addEventListener("click", resetForm);

function resetForm() {
    editingIndex = -1;
    titleInput.value = "";
    bodyInput.value = "";
    saveBtn.textContent = "Save Prompt";
    cancelBtn.style.display = "none";
}

// Render prompt list
async function loadPrompts() {
    const data = await chrome.storage.local.get(["prompts"]);
    const prompts = data.prompts || [];

    promptList.innerHTML = "";

    if (prompts.length === 0) {
        promptList.innerHTML = "<p>No prompts saved yet.</p>";
        return;
    }

    prompts.forEach((prompt, index) => {
        const div = document.createElement("div");
        div.className = "prompt";

        div.innerHTML = `
            <h3></h3>
            <p></p>
            <button class="injectBtn">Inject</button>
            <button class="editBtn">Edit</button>
            <button class="deleteBtn">Delete</button>
        `;

        div.querySelector("h3").textContent = prompt.title;
        div.querySelector("p").textContent = prompt.body;

        div.querySelector(".injectBtn").addEventListener("click", () => {
            injectPrompt(prompt.body);
        });

        div.querySelector(".editBtn").addEventListener("click", () => {
            titleInput.value = prompt.title;
            bodyInput.value = prompt.body;
            editingIndex = index;
            saveBtn.textContent = "Update Prompt";
            cancelBtn.style.display = "block";
        });

        div.querySelector(".deleteBtn").addEventListener("click", async () => {
            const fresh = await chrome.storage.local.get(["prompts"]);
            const list = fresh.prompts || [];
            list.splice(index, 1);
            await chrome.storage.local.set({ prompts: list });
            loadPrompts();
        });

        promptList.appendChild(div);
    });
}

// Send prompt to active tab and wait for the content script's reply
async function injectPrompt(promptText) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) return;

    try {
        const response = await chrome.tabs.sendMessage(tabs[0].id, {
            action: "injectPrompt",
            prompt: promptText
        });

        if (response && response.ok) {
            window.close();
        } else {
            alert(
                "Could not inject: " +
                ((response && response.reason) || "unknown reason") +
                "\n\nClick inside a text field first, then try again."
            );
        }
    } catch (err) {
        console.error("PromptVault inject failed:", err);
        alert(
            "Could not inject here.\n\n" +
            "1. Click inside a text field on the page first.\n" +
            "2. Hard-refresh the page (Ctrl+Shift+R) if you just reloaded the extension."
        );
    }
}