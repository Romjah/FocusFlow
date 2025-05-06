// Background script for FocusFlow extension

// Initialize state
let isBlocking = false;
let blockedSites = [];
let activeSessions = {};
let temporarilyAllowedSites = new Map(); // Map of temporarily allowed sites and their timeouts

// Timer state
let timer = {
  running: false,
  isBreak: false,
  timeLeft: 25 * 60, // 25 minutes in seconds
  totalTime: 25 * 60,
  startTime: null,
  timerInterval: null,
  currentSession: 0,
  settings: {
    focusDuration: 25,
    breakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
    blockedSites: [],
    enableNotifications: true
  }
};

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received:", message.action);
  
  if (message.action === "timerStarted" && !message.isBreak) {
    // Start blocking websites during focus sessions
    isBlocking = true;
    blockedSites = message.blockedSites || [];
    console.log("Website blocking enabled for:", blockedSites);
  } else if (message.action === "timerEnded") {
    // Stop blocking websites
    isBlocking = false;
    console.log("Website blocking disabled");
  } else if (message.action === "getRemainingTime") {
    // Send remaining time to block page
    sendResponse({ remainingTime: timer.timeLeft });
    return true;
  } else if (message.action === "allowTemporary") {
    // Temporarily allow a blocked site
    allowSiteTemporarily(message.site, message.duration || 5);
    sendResponse({ success: true });
  } else if (message.action === "startTimer") {
    startTimer(message.isBreak, message.duration, message.settings);
    sendResponse({ success: true, timerState: getTimerState() });
  } else if (message.action === "pauseTimer") {
    pauseTimer();
    sendResponse({ success: true, timerState: getTimerState() });
  } else if (message.action === "resetTimer") {
    resetTimer(message.isBreak);
    sendResponse({ success: true, timerState: getTimerState() });
  } else if (message.action === "getTimerState") {
    sendResponse({ timerState: getTimerState() });
  } else if (message.action === "updateSettings") {
    timer.settings = message.settings;
    // If timer isn't running, update the time left based on new settings
    if (!timer.running) {
      if (!timer.isBreak) {
        timer.timeLeft = timer.settings.focusDuration * 60;
        timer.totalTime = timer.timeLeft;
      } else {
        if (timer.currentSession % timer.settings.sessionsBeforeLongBreak === 0) {
          timer.timeLeft = timer.settings.longBreakDuration * 60;
        } else {
          timer.timeLeft = timer.settings.breakDuration * 60;
        }
        timer.totalTime = timer.timeLeft;
      }
    }
    sendResponse({ success: true });
  }
  
  // Always respond to ensure the message channel closes
  if (!sendResponse.called) {
    sendResponse({ success: true });
  }
  return true; // Keep the messaging channel open for async responses
});

// Function to temporarily allow a blocked site
function allowSiteTemporarily(site, minutes) {
  if (!site) return;
  
  // Clean up any existing timeout for this site
  if (temporarilyAllowedSites.has(site)) {
    clearTimeout(temporarilyAllowedSites.get(site).timeout);
  }
  
  // Create a new timeout and store it
  const expiryTime = Date.now() + (minutes * 60 * 1000);
  const timeoutId = setTimeout(() => {
    temporarilyAllowedSites.delete(site);
    console.log(`Temporary access expired for ${site}`);
  }, minutes * 60 * 1000);
  
  // Store the timeout and expiry time
  temporarilyAllowedSites.set(site, {
    timeout: timeoutId,
    expiryTime: expiryTime
  });
  
  console.log(`Temporarily allowed ${site} for ${minutes} minutes`);
}

// Timer functions
function startTimer(isBreak, duration, settings) {
  if (timer.running) return;
  
  // Update settings if provided
  if (settings) {
    timer.settings = settings;
  }
  
  // Set timer state
  timer.running = true;
  timer.isBreak = isBreak === true;
  
  // Set the duration based on the type of timer
  if (duration) {
    timer.timeLeft = duration;
    timer.totalTime = duration;
  } else if (timer.isBreak) {
    if (timer.currentSession % timer.settings.sessionsBeforeLongBreak === 0) {
      timer.timeLeft = timer.settings.longBreakDuration * 60;
    } else {
      timer.timeLeft = timer.settings.breakDuration * 60;
    }
    timer.totalTime = timer.timeLeft;
  } else {
    timer.timeLeft = timer.settings.focusDuration * 60;
    timer.totalTime = timer.timeLeft;
  }
  
  // Website blocking
  if (!timer.isBreak) {
    isBlocking = true;
    blockedSites = timer.settings.blockedSites;
  } else {
    isBlocking = false;
  }
  
  // Start the timer interval
  timer.startTime = Date.now();
  clearInterval(timer.timerInterval);
  timer.timerInterval = setInterval(updateTimer, 1000);
  
  // Update badge
  updateBadge();
  
  // Notify the popup if it's open
  notifyPopupOfTimerUpdate();
}

function pauseTimer() {
  if (!timer.running) return;
  
  timer.running = false;
  clearInterval(timer.timerInterval);
  
  // Disable website blocking when paused
  isBlocking = false;
  
  // Update badge
  updateBadge();
  
  // Notify the popup if it's open
  notifyPopupOfTimerUpdate();
}

function resetTimer(isBreak) {
  clearInterval(timer.timerInterval);
  timer.running = false;
  
  // Reset timer state
  timer.isBreak = isBreak === true;
  
  if (!timer.isBreak) {
    timer.timeLeft = timer.settings.focusDuration * 60;
  } else {
    if (timer.currentSession % timer.settings.sessionsBeforeLongBreak === 0) {
      timer.timeLeft = timer.settings.longBreakDuration * 60;
    } else {
      timer.timeLeft = timer.settings.breakDuration * 60;
    }
  }
  timer.totalTime = timer.timeLeft;
  
  // Disable website blocking when reset
  isBlocking = false;
  
  // Update badge
  updateBadge();
  
  // Notify the popup if it's open
  notifyPopupOfTimerUpdate();
}

function updateTimer() {
  if (!timer.running) return;
  
  timer.timeLeft--;
  updateBadge();
  
  // Notify the popup of time update
  notifyPopupOfTimerUpdate();
  
  if (timer.timeLeft <= 0) {
    clearInterval(timer.timerInterval);
    timer.running = false;
    
    if (timer.isBreak) {
      // End of break
      timer.isBreak = false;
      timer.timeLeft = timer.settings.focusDuration * 60;
      timer.totalTime = timer.timeLeft;
      
      // Enable website blocking for focus session
      isBlocking = true;
      blockedSites = timer.settings.blockedSites;
      
      // Send notification
      if (timer.settings.enableNotifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'images/icon128.png',
          title: 'Break Ended',
          message: 'Time to focus!'
        });
      }
    } else {
      // End of focus session
      timer.currentSession++;
      
      // Update stats (in the future, this would be more comprehensive)
      const today = new Date().toDateString();
      chrome.storage.sync.get(['stats'], (data) => {
        let stats = data.stats || {
          daily: {
            sessionsCompleted: 0,
            focusTime: 0,
            tasksCompleted: 0,
            date: today
          },
          weekly: {
            sessions: [0, 0, 0, 0, 0, 0, 0],
            focusTime: [0, 0, 0, 0, 0, 0, 0],
            tasksCompleted: [0, 0, 0, 0, 0, 0, 0],
            startOfWeek: getStartOfWeek(new Date()).toDateString()
          }
        };
        
        // Reset daily stats if it's a new day
        if (stats.daily.date !== today) {
          stats.daily = {
            sessionsCompleted: 0,
            focusTime: 0,
            tasksCompleted: 0,
            date: today
          };
        }
        
        // Reset weekly stats if it's a new week
        const startOfWeek = getStartOfWeek(new Date()).toDateString();
        if (stats.weekly.startOfWeek !== startOfWeek) {
          stats.weekly = {
            sessions: [0, 0, 0, 0, 0, 0, 0],
            focusTime: [0, 0, 0, 0, 0, 0, 0],
            tasksCompleted: [0, 0, 0, 0, 0, 0, 0],
            startOfWeek: startOfWeek
          };
        }
        
        // Update stats
        stats.daily.sessionsCompleted++;
        stats.daily.focusTime += timer.settings.focusDuration;
        stats.weekly.sessions[new Date().getDay()]++;
        stats.weekly.focusTime[new Date().getDay()] += timer.settings.focusDuration;
        
        // Save stats
        chrome.storage.sync.set({ stats });
      });
      
      // Start break
      timer.isBreak = true;
      
      // Determine if it's time for a long break
      if (timer.currentSession % timer.settings.sessionsBeforeLongBreak === 0) {
        timer.timeLeft = timer.settings.longBreakDuration * 60;
      } else {
        timer.timeLeft = timer.settings.breakDuration * 60;
      }
      timer.totalTime = timer.timeLeft;
      
      // Disable website blocking during break
      isBlocking = false;
      
      // Send notification
      if (timer.settings.enableNotifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'images/icon128.png',
          title: 'Focus Session Completed',
          message: 'Time for a break!'
        });
      }
    }
    
    // Restart timer automatically
    startTimer(timer.isBreak);
  }
}

// Helper functions
function getTimerState() {
  return {
    running: timer.running,
    isBreak: timer.isBreak,
    timeLeft: timer.timeLeft,
    totalTime: timer.totalTime,
    currentSession: timer.currentSession
  };
}

function updateBadge() {
  const minutes = Math.floor(timer.timeLeft / 60);
  const text = minutes.toString();
  
  // Display the minutes remaining in the badge
  chrome.action.setBadgeText({ text: timer.running ? text : '' });
  
  // Set the badge color based on timer type
  if (timer.isBreak) {
    chrome.action.setBadgeBackgroundColor({ color: '#63d297' }); // Green for break
  } else {
    chrome.action.setBadgeBackgroundColor({ color: '#eb6a5c' }); // Red for focus
  }
}

function notifyPopupOfTimerUpdate() {
  chrome.runtime.sendMessage({ 
    action: 'timerUpdated',
    timerState: getTimerState()
  }).catch(() => {
    // Popup might be closed, which is fine
  });
}

function getStartOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - day);
  return copy;
}

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

// Load settings when extension starts
chrome.storage.sync.get(['settings'], (data) => {
  if (data.settings) {
    timer.settings = data.settings;
    timer.timeLeft = timer.settings.focusDuration * 60;
    timer.totalTime = timer.timeLeft;
  }
});

// Helper function to check if a site should be blocked
function shouldBlockSite(hostname) {
  if (!blockedSites || blockedSites.length === 0) return false;
  
  // Check if the site is temporarily allowed
  if (temporarilyAllowedSites.has(hostname)) {
    return false;
  }
  
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
  }
}); 