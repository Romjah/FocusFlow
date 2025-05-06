// Block page functionality
document.addEventListener('DOMContentLoaded', function() {
  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const site = urlParams.get('site');
  const originalUrl = urlParams.get('url');
  const sessionId = urlParams.get('session');
  
  // Update UI
  document.getElementById('blockedSite').textContent = site || 'this website';
  
  // Check remaining time
  chrome.runtime.sendMessage({ action: "getRemainingTime" }, (response) => {
    if (response && response.remainingTime) {
      updateTimer(response.remainingTime);
    } else {
      document.getElementById('remainingTime').textContent = "Focus session active";
    }
  });
  
  // Set up a periodic check for timer updates
  const timerUpdateInterval = setInterval(() => {
    chrome.runtime.sendMessage({ action: "getRemainingTime" }, (response) => {
      if (response && response.remainingTime) {
        updateTimer(response.remainingTime);
      } else {
        clearInterval(timerUpdateInterval);
      }
    });
  }, 1000);
  
  // Go back button
  document.getElementById('goBackBtn').addEventListener('click', () => {
    // Go back to the previous page
    window.history.back();
  });
  
  // Continue anyway button (temporary override)
  document.getElementById('continueAnywayBtn').addEventListener('click', () => {
    if (originalUrl) {
      // Send message to background script to allow this site temporarily
      chrome.runtime.sendMessage({
        action: "allowTemporary",
        site: site,
        sessionId: sessionId,
        duration: 5 // 5 minutes
      }, () => {
        // Navigate to the original URL
        window.location.href = originalUrl;
      });
    }
  });
  
  // Timer update function
  function updateTimer(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    document.getElementById('remainingTime').textContent = 
      `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}); 