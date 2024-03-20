let currentTabId = null; // stores the current active tab
let startTime = Date.now(); // when user starts interacting with the active tab

chrome.alarms.create('trackTime', {periodInMinutes: 1 / 12}); // alarms that triggers every 5 secs

function updateCurrentTabTime() {
    // chrome.tabs.query parameter: object defines properties of tab (queryInf0), callback func
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
        if (tabs.length === 0) return; //means no active tab
        let tab = tabs[0]; // tab object: id, index, ...
        if (!tab.url) return; // if tab has no url, return (likely a special tab/new tab)

        // only get hostname/domain, no path/query string
        let url = new URL(tab.url).hostname;
        let currentTime = Date.now();

        // check if we're still on the same tab
        if (currentTabId === tab.id){
            let timeSpent = (currentTime - startTime) / 1000;
            // calc time in seconds
            updateSiteTime(url,timeSpent);
        }
        currentTabId = tab.id;
        startTime = currentTime;

    });
}


function updateSiteTime(url, timeSpent) { // works with local storage
    chrome.storage.local.get({siteTime: {}}, function (data) {
        let siteTime = data.siteTime;
        if (siteTime[url]){ // if time alr exist, add timeSpent
            siteTime[url] += timeSpent;
        }
        else{ // else create new object w site url and timeSpent
            siteTime[url] = timeSpent;
        }
        chrome.storage.local.set({siteTime}, function logUpdate(){
            console.log("site time update", siteTime);
        })
    })
}

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'trackTime'){
        updateCurrentTabTime();
    }
})

// Without this, your program wouldn't be able to track time spent on different tabs separately. 
// It would continue counting time from the previous tab even after the user has switched to a new one.
chrome.tabs.onActivated.addListener(function (activeInfo) {
    startTime = Date.now();
    currentTabId = activeInfo.tabId;
})


chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (tab.active && changeInfo.url) {
        let url = new URL(changeInfo.url).hostname;
        let currentTime = Date.now();
        let timeSpent = (currentTime - startTime);
        updateSiteTime(url, timeSpent);
        startTime = currentTime;
        currentTabId = tabId;
    }
})

