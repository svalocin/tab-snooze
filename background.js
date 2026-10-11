const MENU = {
  OTHERS: "snooze-others",
  LEFT: "snooze-left",
  RIGHT: "snooze-right",
};

const SKIP_URL_PREFIXES = [
  "chrome://",
  "chrome-search://",
  "chrome-extension://",
  "chrome-untrusted://",
  "devtools://",
  "edge://",
  "brave://",
  "opera://",
  "vivaldi://",
  "about:",
  "https://www.google.com/_/chrome/newtab",
];

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "snooze-parent",
      title: "休眠标签页",
      contexts: ["tab"],
    });

    chrome.contextMenus.create({
      id: MENU.OTHERS,
      parentId: "snooze-parent",
      title: "休眠其他标签页",
      contexts: ["tab"],
    });

    chrome.contextMenus.create({
      id: MENU.LEFT,
      parentId: "snooze-parent",
      title: "休眠左侧标签页",
      contexts: ["tab"],
    });

    chrome.contextMenus.create({
      id: MENU.RIGHT,
      parentId: "snooze-parent",
      title: "休眠右侧标签页",
      contexts: ["tab"],
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id || tab.windowId == null || tab.index == null) return;

  const tabs = await chrome.tabs.query({ windowId: tab.windowId });
  const targets = pickTargets(info.menuItemId, tabs, tab);

  await Promise.all(
    targets.map((t) =>
      chrome.tabs.discard(t.id).catch((err) => {
        console.warn(`无法休眠标签页 ${t.id}:`, err);
      }),
    ),
  );
});

/**
 * @param {string} menuItemId
 * @param {chrome.tabs.Tab[]} tabs
 * @param {chrome.tabs.Tab} current
 * @returns {chrome.tabs.Tab[]}
 */
function pickTargets(menuItemId, tabs, current) {
  return tabs.filter((t) => {
    if (!t.id || t.pinned || t.discarded || t.id === current.id) return false;
    if (shouldSkip(t)) return false;

    switch (menuItemId) {
      case MENU.OTHERS:
        return true;
      case MENU.LEFT:
        return t.index < current.index;
      case MENU.RIGHT:
        return t.index > current.index;
      default:
        return false;
    }
  });
}

/**
 * @param {chrome.tabs.Tab} tab
 * @returns {boolean}
 */
function shouldSkip(tab) {
  if (tab.audible || tab.autoDiscardable === false) return true;

  const url = tab.url || tab.pendingUrl || "";
  return SKIP_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}
