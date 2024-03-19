author: Liam 
summary: USF GDSC Chrome extension that keep track of the ammount of time that the user has spent on a website
id: usf-gdsc-chrome-extension
tags: workshop
categories: JavaScript
enviroments: web
status: published

# Screen Time Tracker

## Add information about the extension
Duration: 00:10:00

Create a manifest.json file in the root of the project and add the following code:

```json
{
  "manifest_version": 3,
  "name": "Screen Time Tracker",
  "version": "1.0",
  "description": "Tracks how much time you spend on websites.",
  "permissions": ["tabs", "storage", "activeTab", "alarms"],
  "background": {
    "service_worker": "background.js"
  }
}
```
##  Provide the Icons 
Duration: 00:10:00

Create an images folder. Go to https://github.com/dlinh31/screen-time/tree/main/images, download the images and add them to the folder that was just created.

Next update the manifest.json file, to include the icons just added. The code now should look like this:

```json
{
  "manifest_version": 3,
  "name": "Screen Time Tracker",
  "version": "1.0",
  "description": "Tracks how much time you spend on websites.",
  "permissions": ["tabs", "storage", "activeTab", "alarms"],
  "background": {
    "service_worker": "background.js"
  },
  "icons": {
    "16": "images/icon16.png",
    "48": "images/icon48.png",
    "128": "images/icon128.png"
  }
}
```

## Write HTML for the popup 
Duration: 00:10:00

Create a popup.html file. In this file include the following code:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Screen Time Tracker</title>
    <style>
        body {
            width: 300px;
            height: 300px;
            overflow: auto;
        }
    </style>
</head>
<body>
    <h1>Screen Time Tracker</h1>
    <div id="siteList"></div>
</body>
</html>
```
## Incorporate HTML popup into extension
duration: 00:05:00

 Now we need to make this HTML popup the default popup. Additionally we will select the default icons as the ones in the images folder. The manifest.json should now look like this:

 ```json
{
  "manifest_version": 3,
  "name": "Screen Time Tracker",
  "version": "1.0",
  "description": "Tracks how much time you spend on websites.",
  "permissions": ["tabs", "storage", "activeTab", "alarms"],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "images/icon16.png",
      "48": "images/icon48.png",
      "128": "images/icon128.png"
    }
  },
  "icons": {
    "16": "images/icon16.png",
    "48": "images/icon48.png",
    "128": "images/icon128.png"
  }
}
 ```

## Basic Background logic
Duration: 00:20:00

Create a background.js file. Add global variables that will be used throughout rest of program.

```javascript
let currentTabId = null;
let startTime = Date.now();
```

Then create an alarm for tracking time in active tab every 5 seconds.

```javascript
chrome.alarms.create('trackTime', { periodInMinutes: 1 / 12 }); // 5 seconds
```

Next we need to create a funtion that handles the update current tab time functionality.

```javascript
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
```

The following step is to update the site time in storage.

```javascript
function updateSiteTime(url, timeSpent) {
  chrome.storage.local.get({siteTime: {}}, function(data) {
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
```


## Background Event Listeners
Duration: 00:15:00

First, we need to incorporate event listener that listens for the alarm and then update the time spent on the current site.

```javascript
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'trackTime') {
    updateCurrentTabTime();
  }
});
```

It is now a workable piece of code. You can upload the extension and try out!

## Handle Tab Switching

Next, we need to listen for tab activation to handle tab switching.

```javascript
chrome.tabs.onActivated.addListener(function(activeInfo) {
  // Reset start time when switching tabs
  startTime = Date.now();
  currentTabId = activeInfo.tabId;
});
```

Then, we also need to listen for tab updates to catch navigations in the same tab.

```javascript
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (tab.active && changeInfo.url) {
    let url = new URL(changeInfo.url).hostname;
    let currentTime = Date.now();
    let timeSpent = (currentTime - startTime) / 1000;
    updateSiteTime(url, timeSpent);
    // Reset the timer for the current tab
    startTime = currentTime;
    currentTabId = tabId;
  }
});
```

Finally, we need to incorporate listening for window focus changes to reset the timer appropriately.

```javascript
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
```

## Popup.js 
Duration: 00:15:00

Create a file called popup.js and add code that will execute when popup.html has loaded. 

```javascript
document.addEventListener('DOMContentLoaded', function() {
  let siteListElement = document.getElementById('siteList');

  // Fetch site time data from storage
  chrome.storage.local.get('siteTime', function (result) {
      let siteTime = result.siteTime || {};
      console.log(siteTime); // Log the retrieved site time data for debugging

      // Clear previous site list content
      siteListElement.innerHTML = '';

      // Create and append elements for each site time entry
      Object.keys(siteTime).forEach(url => {
          let timeSpent = siteTime[url];
          let element = document.createElement('div');
          element.textContent = `${url}: ${timeSpent.toFixed(2)} seconds`;
          siteListElement.appendChild(element);
      });

      // Check if no data is available and show a message
      if (Object.keys(siteTime).length === 0) {
          let noDataElement = document.createElement('div');
          noDataElement.textContent = 'No data available.';
          siteListElement.appendChild(noDataElement);
      }
  });
});

```

Then go back to the popup.html file and at the end of the body include the popup.js file in a script tag. Your new popup.html file should look like this:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Screen Time Tracker</title>
    <style>
        body {
            width: 300px;
            height: 300px;
            overflow: auto;
        }
    </style>
</head>
<body>
    <h1>Screen Time Tracker</h1>
    <div id="siteList"></div>
    <script src="popup.js"></script>
</body>
</html>
```

## Congratulations! You Finshed!

