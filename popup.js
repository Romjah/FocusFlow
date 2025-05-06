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
  function updateTimerDisplay(seconds, isRunning, isTimerBreak) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    
    // Update button states
    startBtn.disabled = isRunning;
    pauseBtn.disabled = !isRunning;
    resetBtn.disabled = !isRunning && seconds === (isTimerBreak ? 
      (currentSession % settings.sessionsBeforeLongBreak === 0 ? settings.longBreakDuration : settings.breakDuration) * 60 : 
      settings.focusDuration * 60);
    
    // Update timer status
    if (isTimerBreak) {
      timerStatus.textContent = currentSession % settings.sessionsBeforeLongBreak === 0 ? 'Long Break' : 'Short Break';
      document.body.classList.remove('focus-mode');
      document.body.classList.add('break-mode');
    } else {
      timerStatus.textContent = 'Focus Session';
      document.body.classList.remove('break-mode');
      document.body.classList.add('focus-mode');
    }
  }

  function startTimer() {
    chrome.runtime.sendMessage({ 
      action: "startTimer", 
      isBreak: isBreak,
      settings: settings
    }, (response) => {
      if (response && response.timerState) {
        updateTimerDisplay(
          response.timerState.timeLeft,
          response.timerState.running,
          response.timerState.isBreak
        );
      }
    });
  }

  function pauseTimer() {
    chrome.runtime.sendMessage({ 
      action: "pauseTimer"
    }, (response) => {
      if (response && response.timerState) {
        updateTimerDisplay(
          response.timerState.timeLeft,
          response.timerState.running,
          response.timerState.isBreak
        );
      }
    });
  }

  function resetTimer() {
    chrome.runtime.sendMessage({ 
      action: "resetTimer",
      isBreak: isBreak
    }, (response) => {
      if (response && response.timerState) {
        updateTimerDisplay(
          response.timerState.timeLeft,
          response.timerState.running,
          response.timerState.isBreak
        );
      }
    });
  }

  // Listen for timer updates from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'timerUpdated' && message.timerState) {
      const state = message.timerState;
      isBreak = state.isBreak;
      currentSession = state.currentSession;
      
      updateTimerDisplay(
        state.timeLeft,
        state.running,
        state.isBreak
      );
    }
    sendResponse({ received: true });
    return true;
  });

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
    
    // Save settings to storage
    chrome.storage.sync.set({ settings }, () => {
      // Update background timer settings
      chrome.runtime.sendMessage({ 
        action: "updateSettings", 
        settings: settings 
      });
      
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
        loadSettings();
      }
      
      if (data.stats) {
        stats = data.stats;
        loadStats();
      } else {
        saveStats(); // Initialize stats
      }
      
      // Get current timer state from background
      chrome.runtime.sendMessage({ action: "getTimerState" }, (response) => {
        if (response && response.timerState) {
          const state = response.timerState;
          isBreak = state.isBreak;
          currentSession = state.currentSession;
          
          updateTimerDisplay(
            state.timeLeft,
            state.running,
            state.isBreak
          );
        }
      });
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
}); 