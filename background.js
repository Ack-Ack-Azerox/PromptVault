const ROOT_ID = "promptvault";

// Build the context menu on install and on browser startup
chrome.runtime.onInstalled.addListener(buildMenu);
chrome.runtime.onStartup.addListener(buildMenu);

// Rebuild the context menu whenever the prompt list changes
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.prompts) {
        buildMenu();
    }
});

async function buildMenu() {
    // Clear first to avoid duplicate-ID errors
    await chrome.contextMenus.removeAll();

    chrome.contextMenus.create({
        id: ROOT_ID,
        title: "PromptVault",
        contexts: ["editable"]
    });

    const data = await chrome.storage.local.get(["prompts"]);
    const prompts = data.prompts || [];

    if (prompts.length === 0) {
        chrome.contextMenus.create({
            id: "promptvault-empty",
            parentId: ROOT_ID,
            title: "(no saved prompts)",
            enabled: false,
            contexts: ["editable"]
        });
        return;
    }

    prompts.forEach((prompt, index) => {
        chrome.contextMenus.create({
            id: "prompt-" + index,
            parentId: ROOT_ID,
            title: prompt.title.slice(0, 40),
            contexts: ["editable"]
        });
    });
}

// Handle right-click menu selection
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!info.menuItemId.startsWith("prompt-")) return;

    const index = parseInt(info.menuItemId.replace("prompt-", ""), 10);
    const data = await chrome.storage.local.get(["prompts"]);
    const prompts = data.prompts || [];
    const selectedPrompt = prompts[index];

    if (!selectedPrompt || !tab || !tab.id) return;

    try {
        await chrome.tabs.sendMessage(tab.id, {
            action: "injectPrompt",
            prompt: selectedPrompt.body
        });
    } catch (err) {
        console.warn("PromptVault: could not inject (refresh the page).", err);
    }
});