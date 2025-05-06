document.addEventListener('DOMContentLoaded', function() {
  // UI Elements
  const timerDisplay = document.getElementById('timerDisplay');
  const timerStatus = document.getElementById('timerStatus');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const addTaskBtn = document.getElementById('addTaskBtn');
  const tasksList = document.getElementById('tasksList');
  const newTaskInput = document.getElementById('newTaskInput');
  const taskInput = document.getElementById('taskInput');
  const saveTaskBtn = document.getElementById('saveTaskBtn');
  const cancelTaskBtn = document.getElementById('cancelTaskBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const statsBtn = document.getElementById('statsBtn');
  const statsPanel = document.getElementById('statsPanel');
  const closeStatsBtn = document.getElementById('closeStatsBtn');
  const tabBtns = document.querySelectorAll('.tab-btn');

  // State variables
  let timer = null;
  let timeLeft = 25 * 60; // 25 minutes in seconds
  let isRunning = false;
  let isBreak = false;
  let currentSession = 0;
  let tasks = [];
  let settings = {
    focusDuration: 25,
    breakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
    blockedSites: [],
    enableNotifications: true
  };
  let stats = {
    daily: {
      sessionsCompleted: 0,
      focusTime: 0,
      tasksCompleted: 0,
      date: new Date().toDateString()
    },
    weekly: {
      sessions: [0, 0, 0, 0, 0, 0, 0], // Sun to Sat
      focusTime: [0, 0, 0, 0, 0, 0, 0],
      tasksCompleted: [0, 0, 0, 0, 0, 0, 0],
      startOfWeek: getStartOfWeek(new Date()).toDateString()
    }
  };

  // Load data from storage
  loadData();

  // Timer functionality
  function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  function startTimer() {
    if (isRunning) return;
    
    isRunning = true;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    resetBtn.disabled = false;
    
    chrome.runtime.sendMessage({ 
      action: "timerStarted", 
      isBreak: isBreak,
      blockedSites: settings.blockedSites 
    });

    timer = setInterval(() => {
      timeLeft--;
      updateTimerDisplay();
      
      if (timeLeft <= 0) {
        clearInterval(timer);
        timer = null;
        isRunning = false;
        
        if (isBreak) {
          // End of break
          isBreak = false;
          timeLeft = settings.focusDuration * 60;
          timerStatus.textContent = 'Focus Session';
          document.body.classList.remove('break-mode');
          document.body.classList.add('focus-mode');
          
          if (settings.enableNotifications) {
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'images/icon128.png',
              title: 'Break Ended',
              message: 'Time to focus!'
            });
          }
        } else {
          // End of focus session
          currentSession++;
          stats.daily.sessionsCompleted++;
          stats.daily.focusTime += settings.focusDuration;
          stats.weekly.sessions[new Date().getDay()]++;
          stats.weekly.focusTime[new Date().getDay()] += settings.focusDuration;
          saveStats();
          
          isBreak = true;
          
          // Determine if it's time for a long break
          if (currentSession % settings.sessionsBeforeLongBreak === 0) {
            timeLeft = settings.longBreakDuration * 60;
            timerStatus.textContent = 'Long Break';
          } else {
            timeLeft = settings.breakDuration * 60;
            timerStatus.textContent = 'Short Break';
          }
          
          document.body.classList.remove('focus-mode');
          document.body.classList.add('break-mode');
          
          if (settings.enableNotifications) {
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'images/icon128.png',
              title: 'Focus Session Completed',
              message: 'Time for a break!'
            });
          }
          
          // Disable website blocking during break
          chrome.runtime.sendMessage({ 
            action: "timerEnded"
          });
        }
        
        updateTimerDisplay();
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        resetBtn.disabled = false;
      }
    }, 1000);
  }

  function pauseTimer() {
    if (!isRunning) return;
    
    clearInterval(timer);
    timer = null;
    isRunning = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    
    // Disable website blocking when paused
    chrome.runtime.sendMessage({ 
      action: "timerEnded"
    });
  }

  function resetTimer() {
    clearInterval(timer);
    timer = null;
    isRunning = false;
    
    if (isBreak) {
      isBreak = false;
      timeLeft = settings.focusDuration * 60;
      timerStatus.textContent = 'Focus Session';
      document.body.classList.remove('break-mode');
      document.body.classList.add('focus-mode');
    } else {
      timeLeft = settings.focusDuration * 60;
    }
    
    updateTimerDisplay();
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resetBtn.disabled = true;
    
    // Disable website blocking when reset
    chrome.runtime.sendMessage({ 
      action: "timerEnded"
    });
  }

  // Task management
  function renderTasks() {
    tasksList.innerHTML = '';
    
    if (tasks.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-tasks';
      emptyMessage.textContent = 'No tasks yet. Add one to get started!';
      tasksList.appendChild(emptyMessage);
      return;
    }
    
    tasks.forEach((task, index) => {
      const taskItem = document.createElement('div');
      taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'task-checkbox';
      checkbox.checked = task.completed;
      checkbox.addEventListener('change', () => toggleTaskCompletion(index));
      
      const taskText = document.createElement('div');
      taskText.className = 'task-text';
      taskText.textContent = task.text;
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'task-delete icon-btn';
      deleteBtn.textContent = '×';
      deleteBtn.title = 'Delete task';
      deleteBtn.addEventListener('click', () => deleteTask(index));
      
      taskItem.appendChild(checkbox);
      taskItem.appendChild(taskText);
      taskItem.appendChild(deleteBtn);
      tasksList.appendChild(taskItem);
    });
  }

  function addTask(text) {
    if (!text.trim()) return;
    
    tasks.push({
      text: text.trim(),
      completed: false,
      createdAt: new Date().toISOString()
    });
    
    saveTasks();
    renderTasks();
  }

  function toggleTaskCompletion(index) {
    tasks[index].completed = !tasks[index].completed;
    
    if (tasks[index].completed) {
      // Update stats when task is completed
      stats.daily.tasksCompleted++;
      stats.weekly.tasksCompleted[new Date().getDay()]++;
      saveStats();
    } else {
      // Decrement stats if task is unchecked
      stats.daily.tasksCompleted = Math.max(0, stats.daily.tasksCompleted - 1);
      stats.weekly.tasksCompleted[new Date().getDay()] = Math.max(0, stats.weekly.tasksCompleted[new Date().getDay()] - 1);
      saveStats();
    }
    
    saveTasks();
    renderTasks();
  }

  function deleteTask(index) {
    // Update stats if deleting a completed task
    if (tasks[index].completed) {
      stats.daily.tasksCompleted = Math.max(0, stats.daily.tasksCompleted - 1);
      stats.weekly.tasksCompleted[new Date().getDay()] = Math.max(0, stats.weekly.tasksCompleted[new Date().getDay()] - 1);
      saveStats();
    }
    
    tasks.splice(index, 1);
    saveTasks();
    renderTasks();
  }

  // Settings management
  function loadSettings() {
    const focusDurationInput = document.getElementById('focusDuration');
    const breakDurationInput = document.getElementById('breakDuration');
    const longBreakDurationInput = document.getElementById('longBreakDuration');
    const sessionsBeforeLongBreakInput = document.getElementById('sessionsBeforeLongBreak');
    const blockedSitesInput = document.getElementById('blockedSites');
    const enableNotificationsInput = document.getElementById('enableNotifications');
    
    focusDurationInput.value = settings.focusDuration;
    breakDurationInput.value = settings.breakDuration;
    longBreakDurationInput.value = settings.longBreakDuration;
    sessionsBeforeLongBreakInput.value = settings.sessionsBeforeLongBreak;
    blockedSitesInput.value = settings.blockedSites.join('\n');
    enableNotificationsInput.checked = settings.enableNotifications;
  }

  function saveSettings() {
    const focusDurationInput = document.getElementById('focusDuration');
    const breakDurationInput = document.getElementById('breakDuration');
    const longBreakDurationInput = document.getElementById('longBreakDuration');
    const sessionsBeforeLongBreakInput = document.getElementById('sessionsBeforeLongBreak');
    const blockedSitesInput = document.getElementById('blockedSites');
    const enableNotificationsInput = document.getElementById('enableNotifications');
    
    settings.focusDuration = parseInt(focusDurationInput.value) || 25;
    settings.breakDuration = parseInt(breakDurationInput.value) || 5;
    settings.longBreakDuration = parseInt(longBreakDurationInput.value) || 15;
    settings.sessionsBeforeLongBreak = parseInt(sessionsBeforeLongBreakInput.value) || 4;
    settings.blockedSites = blockedSitesInput.value
      .split('\n')
      .map(site => site.trim())
      .filter(site => site.length > 0);
    settings.enableNotifications = enableNotificationsInput.checked;
    
    // Update current timer if not running
    if (!isRunning) {
      if (!isBreak) {
        timeLeft = settings.focusDuration * 60;
      } else {
        if (currentSession % settings.sessionsBeforeLongBreak === 0) {
          timeLeft = settings.longBreakDuration * 60;
        } else {
          timeLeft = settings.breakDuration * 60;
        }
      }
      updateTimerDisplay();
    }
    
    chrome.storage.sync.set({ settings }, () => {
      // Display temporary saved message
      const savedMsg = document.createElement('div');
      savedMsg.className = 'settings-saved';
      savedMsg.textContent = 'Settings saved!';
      savedMsg.style.position = 'absolute';
      savedMsg.style.bottom = '20px';
      savedMsg.style.left = '50%';
      savedMsg.style.transform = 'translateX(-50%)';
      savedMsg.style.backgroundColor = 'var(--secondary-color)';
      savedMsg.style.color = 'white';
      savedMsg.style.padding = '8px 16px';
      savedMsg.style.borderRadius = '4px';
      document.body.appendChild(savedMsg);
      
      setTimeout(() => {
        document.body.removeChild(savedMsg);
      }, 2000);
    });
  }

  // Statistics management
  function loadStats() {
    // Reset stats if it's a new day
    const today = new Date().toDateString();
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
    
    // Update UI
    document.getElementById('dailySessionsCompleted').textContent = stats.daily.sessionsCompleted;
    document.getElementById('dailyFocusTime').textContent = `${stats.daily.focusTime} min`;
    document.getElementById('dailyTasksCompleted').textContent = stats.daily.tasksCompleted;
    
    document.getElementById('weeklySessionsCompleted').textContent = stats.weekly.sessions.reduce((a, b) => a + b, 0);
    document.getElementById('weeklyFocusTime').textContent = `${stats.weekly.focusTime.reduce((a, b) => a + b, 0)} min`;
    document.getElementById('weeklyTasksCompleted').textContent = stats.weekly.tasksCompleted.reduce((a, b) => a + b, 0);
    
    // We could add chart rendering here in the future
  }

  function getStartOfWeek(date) {
    const copy = new Date(date);
    const day = copy.getDay();
    copy.setDate(copy.getDate() - day);
    return copy;
  }

  // Storage functions
  function loadData() {
    chrome.storage.sync.get(['tasks', 'settings', 'stats'], (data) => {
      if (data.tasks) {
        tasks = data.tasks;
        renderTasks();
      }
      
      if (data.settings) {
        settings = { ...settings, ...data.settings };
        timeLeft = settings.focusDuration * 60;
        loadSettings();
      }
      
      if (data.stats) {
        stats = data.stats;
        loadStats();
      } else {
        saveStats(); // Initialize stats
      }
      
      updateTimerDisplay();
    });
  }

  function saveTasks() {
    chrome.storage.sync.set({ tasks });
  }

  function saveStats() {
    chrome.storage.sync.set({ stats }, loadStats);
  }

  // Event listeners
  startBtn.addEventListener('click', startTimer);
  pauseBtn.addEventListener('click', pauseTimer);
  resetBtn.addEventListener('click', resetTimer);
  
  addTaskBtn.addEventListener('click', () => {
    newTaskInput.style.display = 'flex';
    taskInput.focus();
  });
  
  saveTaskBtn.addEventListener('click', () => {
    addTask(taskInput.value);
    taskInput.value = '';
    newTaskInput.style.display = 'none';
  });
  
  cancelTaskBtn.addEventListener('click', () => {
    taskInput.value = '';
    newTaskInput.style.display = 'none';
  });
  
  taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addTask(taskInput.value);
      taskInput.value = '';
      newTaskInput.style.display = 'none';
    }
  });
  
  settingsBtn.addEventListener('click', () => {
    loadSettings();
    settingsPanel.style.display = 'block';
  });
  
  closeSettingsBtn.addEventListener('click', () => {
    settingsPanel.style.display = 'none';
  });
  
  saveSettingsBtn.addEventListener('click', () => {
    saveSettings();
    settingsPanel.style.display = 'none';
  });
  
  statsBtn.addEventListener('click', () => {
    loadStats();
    statsPanel.style.display = 'block';
  });
  
  closeStatsBtn.addEventListener('click', () => {
    statsPanel.style.display = 'none';
  });
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Toggle active class
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Show corresponding content
      const tabName = btn.dataset.tab;
      document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
      });
      document.getElementById(`${tabName}Stats`).style.display = 'block';
    });
  });

  // Initialize UI state
  updateTimerDisplay();
}); 