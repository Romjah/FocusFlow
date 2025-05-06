// Background script for FocusFlow extension

// Initialize state
let isBlocking = false;
let blockedSites = [];
let activeSessions = {};

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "timerStarted" && !message.isBreak) {
    // Start blocking websites during focus sessions
    isBlocking = true;
    blockedSites = message.blockedSites || [];
    console.log("Website blocking enabled for:", blockedSites);
  } else if (message.action === "timerEnded") {
    // Stop blocking websites
    isBlocking = false;
    console.log("Website blocking disabled");
  }
  
  // Always respond to ensure the message channel closes
  sendResponse({ success: true });
  return true; // Keep the messaging channel open for async responses
});

// Intercept web requests to blocked sites
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (!isBlocking || !details.url) return;
  
  // Skip blocking for extension pages
  if (details.url.startsWith("chrome-extension://")) return;
  
  const url = new URL(details.url);
  const hostname = url.hostname;
  
  // Check if the site should be blocked
  if (shouldBlockSite(hostname)) {
    // If this is the main frame, redirect to our block page
    if (details.frameId === 0) {
      // Create session ID for this tab if it doesn't exist
      if (!activeSessions[details.tabId]) {
        activeSessions[details.tabId] = Date.now().toString();
      }

      // Redirect to block page
      chrome.tabs.update(details.tabId, {
        url: chrome.runtime.getURL("block.html") + 
             "?site=" + encodeURIComponent(hostname) + 
             "&url=" + encodeURIComponent(details.url) + 
             "&session=" + activeSessions[details.tabId]
      });
    }
  }
});

// Clean up sessions when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeSessions[tabId]) {
    delete activeSessions[tabId];
  }
});

// Helper function to check if a site should be blocked
function shouldBlockSite(hostname) {
  if (!blockedSites || blockedSites.length === 0) return false;
  
  return blockedSites.some(site => {
    // Convert site pattern to lowercase and trim for comparison
    const pattern = site.toLowerCase().trim();
    
    // Exact match
    if (hostname === pattern) return true;
    
    // Subdomain match (e.g., "facebook.com" blocks "www.facebook.com" and "m.facebook.com")
    if (hostname.endsWith('.' + pattern)) return true;
    
    // Wildcard matching (e.g., "*.facebook.com")
    if (pattern.startsWith('*.') && hostname.endsWith(pattern.substring(1))) return true;
    
    return false;
  });
}

// Set up alarm to periodically sync data
chrome.alarms.create('syncData', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncData') {
    console.log('Syncing data...');
    // Here we could perform any periodic tasks like syncing data
    // This could be expanded in the future with additional functionality
  }
}); 