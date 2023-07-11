function sendMessageToTabs(request, tabs) {
    request.extensionId = chrome.runtime.id;
    for (let tab of tabs) {
        chrome.tabs.sendMessage(tab.id, request)
            .then(() => { }).catch(() => { });
    }
}

function activateTab(allTabs, srcTabId, delta, loop, shouldPreventContextMenu) {
    allTabs.sort((a, b) => a.index - b.index);
    let i = allTabs.findIndex((tab) => tab.id === srcTabId);

    if (i === -1) {
        if (shouldPreventContextMenu) {
            sendMessageToTabs({ type: 'prevent-contextmenu' }, [{ id: srcTabId }]);
        }
        return false;
    }
    if (delta === -1 && i === 0) {
        if (loop) {
            i = allTabs.length;
        }
        else {
            if (shouldPreventContextMenu) {
                sendMessageToTabs({ type: 'prevent-contextmenu' }, [{ id: srcTabId }]);
            }
            return false;
        }
    }
    if (delta === 1 && i === allTabs.length - 1) {
        if (loop) {
            i = -1;
        }
        else {
            if (shouldPreventContextMenu) {
                sendMessageToTabs({ type: 'prevent-contextmenu' }, [{ id: srcTabId }]);
            }
            return false;
        }
    }

    let targetTab = allTabs[i + delta];
    chrome.tabs.update(targetTab.id, { active: true });
    if (shouldPreventContextMenu) {
        sendMessageToTabs({ type: 'prevent-contextmenu' }, [targetTab]);
    }

    return true;
}

function activateMostLeftTab(allTabs, shouldPreventContextMenu) {
    allTabs.sort((a, b) => a.index - b.index);
    chrome.tabs.update(allTabs[0].id, { active: true });
    if (shouldPreventContextMenu) {
        sendMessageToTabs({ type: 'prevent-contextmenu' }, [allTabs[0]]);
    }

    return true;
}

function activateMostRightTab(allTabs, shouldPreventContextMenu) {
    allTabs.sort((a, b) => b.index - a.index);
    chrome.tabs.update(allTabs[0].id, { active: true });
    if (shouldPreventContextMenu) {
        sendMessageToTabs({ type: 'prevent-contextmenu' }, [allTabs[0]]);
    }

    return true;
}

class MouseGestureService {
    start() {
        chrome.runtime.onMessage.addListener(
            (request, sender) => {
                if (!request || request.extensionId !== chrome.runtime.id) {
                    return;
                }

                switch (request.action) {
                    case 'createtab':
                        chrome.tabs.create({ active: true });
                        break;
                    case 'duplicatetab':
                        chrome.tabs.duplicate(sender.tab.id);
                        break;
                    case 'closetab':
                        chrome.tabs.remove(sender.tab.id);
                        break;
                    case 'closetableftall':
                        (async () => {
                            const allTabs = await chrome.tabs.query({ currentWindow: true });
                            const i = allTabs.findIndex((element) => element.id === sender.tab.id);
                            if (i) {
                                for (const tab of allTabs) {
                                    if (tab.index < allTabs[i].index) {
                                        chrome.tabs.remove(tab.id);
                                    }
                                }
                            }
                        })();
                        break;
                    case 'closetabrightall':
                        (async () => {
                            const allTabs = await chrome.tabs.query({ currentWindow: true });
                            const i = allTabs.findIndex((element) => element.id === sender.tab.id);
                            if (i) {
                                for (const tab of allTabs) {
                                    if (tab.index > allTabs[i].index) {
                                        chrome.tabs.remove(tab.id);
                                    }
                                }
                            }
                        })();
                        break;
                    case 'closetabotherall':
                        (async () => {
                            const allTabs = await chrome.tabs.query({ currentWindow: true });
                            const i = allTabs.findIndex((element) => element.id === sender.tab.id);
                            if (i) {
                                for (const tab of allTabs) {
                                    if (tab.index !== allTabs[i].index) {
                                        chrome.tabs.remove(tab.id);
                                    }
                                }
                            }
                        })();
                        break;
                    case 'reopenclosedtab':
                        chrome.sessions.getRecentlyClosed((sessions) => {
                            (async () => {
                                if (sessions && sessions[0]) {
                                    await chrome.sessions.restore(sessions[0].tab ? sessions[0].tab.sessionId: sessions[0].window.sessionId);
                                }
                            })();
                        });
                        break;
                    case 'reloadtab':
                        chrome.tabs.reload(sender.tab.id);
                        break;
                    case 'reloadtabhard':
                        chrome.tabs.reload(sender.tab.id, { bypassCache: true });
                        break;
                    case 'gotolefttab':
                        (async () => {
                            const allTabs = await chrome.tabs.query({ currentWindow: true });
                            activateTab(allTabs, sender.tab.id, -1, false, request.bywheel);
                        })();
                        break;
                    case 'gotorighttab':
                        (async () => {
                            const allTabs = await chrome.tabs.query({ currentWindow: true });
                            activateTab(allTabs, sender.tab.id, 1, false, request.bywheel);
                        })();
                        break;
                    case 'gotolefttabwithloop':
                        (async () => {
                            const allTabs = await chrome.tabs.query({ currentWindow: true });
                            activateTab(allTabs, sender.tab.id, -1, true, request.bywheel);
                        })();
                        break;
                    case 'gotorighttabwithloop':
                        (async () => {
                            const allTabs = await chrome.tabs.query({ currentWindow: true });
                            activateTab(allTabs, sender.tab.id, 1, true, request.bywheel);
                        })();
                        break;
                    case 'gotomostlefttab':
                        (async () => {
                            const allTabs = await chrome.tabs.query({ currentWindow: true });
                            activateMostLeftTab(allTabs, request.bywheel);
                        })();
                        break;
                    case 'gotomostrighttab':
                        (async () => {
                            const allTabs = await chrome.tabs.query({ currentWindow: true });
                            activateMostRightTab(allTabs, request.bywheel);
                        })();
                        break;
                    case 'openoptionspage':
                        chrome.runtime.openOptionsPage();
                        break;
                    case 'addbookmark':
                        chrome.bookmarks.search({url: request.bookmark.url}, (result) => {
                            if (result.length === 0) {
                                request.bookmark.parentId = "1";
                                chrome.bookmarks.create(request.bookmark);
                            }
                        });
                        break;
                    case 'deletebookmark':
                        chrome.bookmarks.search({url: request.bookmark.url}, (result) => {
                            for (const bookmark of result) {
                                chrome.bookmarks.remove(bookmark.id);
                            }
                        });
                        break;
                    case 'createwindow':
                        (async () => {
                            await chrome.windows.create();
                        })();
                        break;
                    case 'closewindow':
                        {
                            const p = chrome.windows.getCurrent();
                            p.then((w) => {
                                (async () => {
                                    await chrome.windows.remove(w.id);
                                })();
                            });
                        }
                        break;
                    case 'closewindowall':
                        {
                            const p = chrome.windows.getAll();
                            p.then((ws) => {
                                for (const w of ws) {
                                    (async () => {
                                        await chrome.windows.remove(w.id);
                                    })();
                                }
                            });
                        }
                        break;
                    case 'maximizewindow':
                        {
                            const p = chrome.windows.getCurrent();
                            p.then((w) => {
                                (async () => {
                                    await chrome.windows.update(w.id, { state: 'maximized' });
                                })();
                            });
                        }
                        break;
                    case 'minimizewindow':
                        {
                            const p = chrome.windows.getCurrent();
                            p.then((w) => {
                                (async () => {
                                    await chrome.windows.update(w.id, { state: 'minimized' });
                                })();
                            });
                        }
                        break;
                    case 'fullscreenwindow':
                        {
                            const p = chrome.windows.getCurrent();
                            p.then((w) => {
                                (async () => {
                                    await chrome.windows.update(w.id, { state: 'fullscreen' });
                                })();
                            });
                        }
                        break;
                    case 'writetoclipboard':
                        navigator.clipboard.writeText(request.text).then(() => { });
                        break;
                    case 'mutetab':
                        chrome.tabs.update(sender.tab.id, { muted: true });
                        break;
                    case 'unmutetab':
                        chrome.tabs.update(sender.tab.id, { muted: false });
                        break;
                    case 'mutetaball':
                        (async () => {
                            const allTabs = await chrome.tabs.query({});
                            for (const tab of allTabs) {
                                chrome.tabs.update(tab.id, { muted: true });
                            }
                        })();
                        break;
                    case 'unmutetaball':
                        (async () => {
                            const allTabs = await chrome.tabs.query({});
                            for (const tab of allTabs) {
                                chrome.tabs.update(tab.id, { muted: false });
                            }
                        })();
                        break;
                    case 'mutetabtoggle':
                        chrome.tabs.update(sender.tab.id, { muted: !sender.tab.mutedInfo.muted });
                        break;
                    case 'zoomin':
                        (async () => {
                            const zoom = (await chrome.tabs.getZoom()) + 0.25;
                            chrome.tabs.setZoom(zoom >= 5 ? 5 : zoom);
                        })();
                        break;
                    case 'zoomout':
                        (async () => {
                            const zoom = (await chrome.tabs.getZoom()) - 0.25;
                            chrome.tabs.setZoom(zoom <= 0 ? 0.25 : zoom);
                        })();
                        break;
                    case 'zoomdefault':
                        (async () => {
                            const zoom = (await chrome.tabs.getZoomSettings());
                            chrome.tabs.setZoom(zoom.defaultZoomFactor);
                        })();
                    default:
                        console.log('Unexpected request:', request);
                }
            }
        );
    }
}

(new MouseGestureService()).start();