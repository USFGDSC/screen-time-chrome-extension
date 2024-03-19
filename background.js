let currentTabId = null;
let startTime = Date.now();

// Create an alarm for tracking time in active tab every 5 seconds
chrome.alarms.create('trackTime', { periodInMinutes: 1 / 20 }); // 3 seconds

// Listen for the alarm and then update the time spent on the current site
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'trackTime') {
    updateCurrentTabTime();
  }
});

// Update time spent on the current tab
function updateCurrentTabTime() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs.length === 0) return; // No active tab

    let tab = tabs[0];
    if (!tab.url) return; // No URL, likely a new tab or special page

    let url = new URL(tab.url).hostname;
    let currentTime = Date.now();

    // Check if we're still on the same tab
    if (currentTabId === tab.id) {
      let timeSpent = (currentTime - startTime) / 1000; // Calculate time spent in seconds
      updateSiteTime(url, timeSpent);
    }

    // Update the current tab and reset the start time
    currentTabId = tab.id;
    startTime = currentTime;
  });
}

// Function to update the site time in storage
function updateSiteTime(url, timeSpent) {
  chrome.storage.local.get({siteTime: {}}, function(data) { // first arg: key to fetch, and default value (empty) if not found
    console.log('Site time data', data);
    let siteTime = data.siteTime;
    if (siteTime[url]) {
      siteTime[url] += timeSpent;
    } else {
      siteTime[url] = timeSpent;
    }
    chrome.storage.local.set({siteTime}, () => {
      console.log('Site time updated', siteTime);
    });
  });
}

// Listen for tab activation to handle tab switching
chrome.tabs.onActivated.addListener(function(activeInfo) {
  // Reset start time when switching tabs
  startTime = Date.now();
  currentTabId = activeInfo.tabId;
});

// Listen for tab updates to catch navigations in the same tab
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (tab.active && changeInfo.url) {
    let url = new URL(changeInfo.url).hostname; //get only hostname of URL
    let currentTime = Date.now();
    let timeSpent = (currentTime - startTime) / 1000;
    updateSiteTime(url, timeSpent);
    // Reset the timer for the current tab
    startTime = currentTime;
    currentTabId = tabId;
  }
});

// Listen for window focus changes to reset the timer appropriately
chrome.windows.onFocusChanged.addListener(function(windowId) {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    currentTabId = null; // No window is focused
  } else {
    chrome.tabs.query({active: true, windowId: windowId}, function(tabs) {
      if (tabs.length > 0) {
        currentTabId = tabs[0].id;
      }
    });
  }
  startTime = Date.now(); // Reset start time whenever window focus changes
});
