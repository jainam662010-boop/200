// Global error handling
window.safeExecute = async (fn, fallback = null) => {
  try {
    return await fn();
  } catch (error) {
    console.error('❌ Error caught:', error);
    if (fallback) return fallback();
    return null;
  }
};

// Global error listener
window.addEventListener('error', (e) => {
  console.error('❌ Global error:', e.error);
  e.preventDefault();
});

'use strict';

const App = {
  // Data management
  _dataManager: null,
  
  // Initialize app
  async init() {
    return await window.safeExecute(async () => {
      console.log('🚀 App initializing...');
      
      // Initialize data manager
      this._dataManager = window.DataManager;
      if (!this._dataManager) {
        console.warn('⚠️ DataManager not found, using fallback');
        this._dataManager = { getData: () => ({ subjects: [] }) };
      }
      
      // Initialize data with error handling
      await window.safeExecute(() => this.loadData(), () => ({ subjects: [] }));
      
      // Initialize UI components
      this.initPage(this.getActivePage());
      this.initNativeGestures();
      
      console.log('✅ App initialized successfully');
      return true;
    }, () => {
      console.error('❌ App init failed');
      return false;
    });
  },

  // Get active page from URL
  getActivePage() {
    const path = window.location.pathname;
    if (path.includes('dashboard.html')) return 'dashboard';
    if (path.includes('subjects.html')) return 'subjects';
    if (path.includes('subject.html')) return 'subject';
    if (path.includes('chapter.html')) return 'chapter';
    if (path.includes('profile.html')) return 'profile';
    if (path.includes('bookmarks.html')) return 'bookmarks';
    return 'dashboard';
  },

  // Initialize page (placeholder for page-specific logic)
  initPage(page) {
    console.log('📄 Initializing page:', page);
    // This will be overridden by individual pages
  },

  // Load data through data manager
  async loadData() {
    return await window.safeExecute(async () => {
      if (this._dataManager && this._dataManager.getData) {
        return await this._dataManager.getData();
      }
      
      // Fallback to direct fetch
      const response = await fetch('data/subjects.json');
      if (response.ok) {
        return await response.json();
      }
      
      // Ultimate fallback
      return {
        subjects: [
          { id: 'math', name: 'Mathematics', icon: '🔢', chapters: [] },
          { id: 'science', name: 'Science', icon: '🔬', chapters: [] },
          { id: 'english', name: 'English', icon: '📖', chapters: [] }
        ]
      };
    }, () => ({ subjects: [] }));
  },

  // Get subject
  async getSubject(id) {
    try {
      return await this._dataManager.getSubject(id);
    } catch (error) {
      console.error('❌ Get subject failed:', error);
      return null;
    }
  },

  // Get chapter
  async getChapter(subjectId, chapterId) {
    try {
      return await this._dataManager.getChapter(subjectId, chapterId);
    } catch (error) {
      console.error('❌ Get chapter failed:', error);
      return null;
    }
  },

  // Get progress
  getProgress() {
    try {
      return this._parseLS('vm_progress', {});
  },

  // Get profile with validation
  getProfile() {
    return this._safeLocalStorage.get('vm_profile', { name: 'Student' });
  },

  // Get bookmarks with validation
  getBookmarks() {
    try {
      return this._parseLS('vm_bookmarks', []);
    } catch (error) {
      console.error('❌ Get bookmarks failed:', error);
      return [];
    }
  },

  // Toggle bookmark
  toggleBookmark(subjectId, chapterId) {
    try {
      const bookmarks = this.getBookmarks();
      const key = `${subjectId}::${chapterId}`;
      const index = bookmarks.indexOf(key);
      
      if (index >= 0) {
        bookmarks.splice(index, 1);
        this._saveLS('vm_bookmarks', bookmarks);
        return false; // Removed
      } else {
        bookmarks.push(key);
        this._saveLS('vm_bookmarks', bookmarks);
        return true; // Added
      }
    } catch (error) {
      console.error('❌ Toggle bookmark failed:', error);
      return false;
    }
  },

  // Check if bookmarked
  isBookmarked(subjectId, chapterId) {
    try {
      return this.getBookmarks().includes(`${subjectId}::${chapterId}`);
    } catch (error) {
      return false;
    }
  },

  // Get subject progress percentage
  getSubjPct(subjectId, subject) {
    try {
      const progress = this.getProgress();
      const subjectProgress = progress[subjectId] || {};
      const completed = subjectProgress.done || [];
      const total = subject?.chapters?.length || 0;
      
      if (total === 0) return 0;
      return Math.round((completed.length / total) * 100);
    } catch (error) {
      console.error('❌ Get subject progress failed:', error);
      return 0;
    }
  },

  // Check if chapter is done
  isDone(subjectId, chapterId) {
    try {
      const progress = this.getProgress();
      return (progress[subjectId]?.done || []).includes(chapterId);
    } catch (error) {
      return false;
    }
  },

  // Mark chapter as done
  markDone(subjectId, chapterId) {
    try {
      const progress = this.getProgress();
      if (!progress[subjectId]) {
        progress[subjectId] = { done: [], scores: {}, last: null };
      }
      
      if (!progress[subjectId].done.includes(chapterId)) {
        progress[subjectId].done.push(chapterId);
        progress[subjectId].last = { cid: chapterId, ts: Date.now() };
        this._saveLS('vm_progress', progress);
        this.updateStreak();
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Mark done failed:', error);
      return false;
    }
  },

  // Update streak
  updateStreak() {
    try {
      const today = new Date().toDateString();
      const lastDate = localStorage.getItem('vm_streak_date');
      let streak = parseInt(localStorage.getItem('vm_streak') || '0');
      
      if (lastDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        streak = (lastDate === yesterday) ? streak + 1 : 1;
        localStorage.setItem('vm_streak', streak);
        localStorage.setItem('vm_streak_date', today);
      }
      
      return streak;
    } catch (error) {
      console.error('❌ Update streak failed:', error);
      return 0;
    }
  },

  // Get URL parameter
  getParam(key) {
    try {
      return new URLSearchParams(location.search).get(key);
    } catch (error) {
      return null;
    }
  },

  // Show update notification
  showUpdateNotification(message) {
    try {
      // Create notification element
      const notification = document.createElement('div');
      notification.className = 'update-notification';
      notification.innerHTML = `
        <div class="notification-content">
          <span class="notification-icon">🔄</span>
          <span class="notification-text">${message}</span>
          <button class="notification-close" onclick="this.parentElement.parentElement.remove()">✕</button>
        </div>
      `;
      
      // Add styles if not exists
      if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
          .update-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--accent);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
          }
          .notification-content {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .notification-icon {
            font-size: 16px;
          }
          .notification-text {
            flex: 1;
            font-size: 14px;
            font-weight: 500;
          }
          .notification-close {
            background: none;
            border: none;
            color: white;
            font-size: 16px;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
          }
          .notification-close:hover {
            background: rgba(255,255,255,0.2);
          }
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `;
        document.head.appendChild(styles);
      }
      
      // Add to page
      document.body.appendChild(notification);
      
      // Auto remove after 5 seconds
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, 5000);
      
    } catch (error) {
      console.error('❌ Show notification failed:', error);
    }
  },

  // Initialize real-time sync
  initRealTimeSync() {
    try {
      if (this._dataManager) {
        this._dataManager.addListener((update) => {
          console.log('📱 App received update:', update.type);
          // Refresh current page data
          this.refreshCurrentPage();
        });
      }
    } catch (error) {
      console.error('❌ Init real-time sync failed:', error);
    }
  },

  // Refresh current page
  async refreshCurrentPage() {
    try {
      // Clear data cache
      this._dataManager.cache = null;
      this._dataManager.initialized = false;
      
      // Reload data
      await this.loadData();
      
      // Re-render current page
      const currentPage = this.getActivePage();
      this.initPage(currentPage);
      
      this.toast('Content updated', '🔄');
    } catch (error) {
      console.error('❌ Refresh page failed:', error);
    }
  },

  // Theme management
  applyMode() {
    try {
      const mode = localStorage.getItem('vm_mode') || 'light';
      document.documentElement.setAttribute('data-mode', mode);
    } catch (error) {
      console.error('❌ Apply mode failed:', error);
    }
  },

  setMode(mode) {
    try {
      document.documentElement.setAttribute('data-mode', mode);
      localStorage.setItem('vm_mode', mode);
      
      // Update mode buttons
      document.querySelectorAll('.mt-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
      });
      
      // Update mode button icon
      const modeBtn = document.getElementById('modeBtn');
      if (modeBtn) {
        modeBtn.innerHTML = mode === 'dark' ? '☀️' : '🌙';
      }
    } catch (error) {
      console.error('❌ Set mode failed:', error);
    }
  },

  toggleMode() {
    try {
      const currentMode = localStorage.getItem('vm_mode') || 'light';
      this.setMode(currentMode === 'dark' ? 'light' : 'dark');
    } catch (error) {
      console.error('❌ Toggle mode failed:', error);
    }
  },

  // Focus mode
  isFocus() {
    try {
      return localStorage.getItem('vm_focus') === '1';
    } catch (error) {
      return false;
    }
  },

  toggleFocus() {
    try {
      const isFocusMode = this.isFocus();
      localStorage.setItem('vm_focus', isFocusMode ? '0' : '1');
      this.toast(isFocusMode ? 'Focus mode off' : 'Focus mode on', '🎯');
      
      // Refresh page after a short delay
      setTimeout(() => location.reload(), 250);
    } catch (error) {
      console.error('❌ Toggle focus failed:', error);
    }
  },

  // Utility functions
  _parseLS(key, defaultValue) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
      console.warn('⚠️ localStorage parse failed for key:', key);
      return defaultValue;
    }
  },

  _saveLS(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('❌ localStorage save failed for key:', key);
      return false;
    }
  },

  // Toast notification
  toast(message, icon = '✅') {
    try {
      let toast = document.getElementById('appToast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'appToast';
        toast.className = 'toast';
        toast.setAttribute('role', 'alert');
        document.body.appendChild(toast);
      }
      
      toast.innerHTML = `<span>${icon}</span> ${this._sanitize(message)}`;
      toast.classList.add('show');
      
      clearTimeout(toast._timeout);
      toast._timeout = setTimeout(() => {
        toast.classList.remove('show');
      }, 3200);
    } catch (error) {
      console.error('❌ Toast failed:', error);
    }
  },

  // Sanitize HTML
  _sanitize(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // Logout
  logout() {
    try {
      localStorage.removeItem('vm_user_role');
      localStorage.removeItem('vm_profile');
      location.href = 'login.html';
    } catch (error) {
      console.error('❌ Logout failed:', error);
      location.href = 'login.html';
    }
  },

  // ===========================================
  // BOTTOM NAVIGATION (MOBILE-FIRST)
  // ===========================================

  renderBottomNav(activeTab = 'dashboard') {
    const tabs = [
      { id: 'dashboard', icon: '🏠', label: 'Home', href: 'dashboard.html' },
      { id: 'subjects', icon: '📚', label: 'Subjects', href: 'subjects.html' },
      { id: 'todo', icon: '✓', label: 'Tasks', href: '#', onclick: 'TodoPanel.show(); return false;' },
      { id: 'bookmarks', icon: '🔖', label: 'Saved', href: 'bookmarks.html' },
      { id: 'profile', icon: '👤', label: 'Profile', href: 'profile.html' }
    ];
    
    const nav = document.getElementById('bottomNav');
    if (!nav) return;
    
    nav.innerHTML = `<nav class="bottom-nav">
      ${tabs.map(t => `<a href="${t.href}" ${t.onclick ? `onclick="${t.onclick}"` : ''} class="bottom-nav-item ${t.id === activeTab ? 'active' : ''}">
        <span class="bottom-nav-icon">${t.icon}</span>
        <span class="bottom-nav-label">${t.label}</span>
      </a>`).join('')}
    </nav>`;
  },

  // ===========================================
  // NATIVE APP GESTURES & INTERACTIONS
  // ===========================================

  initNativeGestures() {
    if (!('ontouchstart' in window)) return;
    
    // Pull-to-refresh
    this._initPullToRefresh();
    
    // Swipe-to-go-back
    this._initSwipeToGoBack();
    
    // Haptic feedback
    this._initHapticFeedback();
    
    // Enhanced touch feedback
    this._initTouchFeedback();
  },

  _initPullToRefresh() {
    let startY = 0;
    let isPulling = false;
    let pullIndicator = null;
    
    // Create pull indicator
    pullIndicator = document.createElement('div');
    pullIndicator.className = 'pull-refresh';
    pullIndicator.innerHTML = '<span class="pull-refresh-icon">🔄</span>';
    document.body.appendChild(pullIndicator);
    
    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
      if (!isPulling) return;
      
      const currentY = e.touches[0].clientY;
      const pullDistance = currentY - startY;
      
      if (pullDistance > 0 && window.scrollY === 0) {
        e.preventDefault();
        
        if (pullDistance > 80) {
          pullIndicator.classList.add('active');
        } else {
          pullIndicator.classList.remove('active');
        }
      }
    });
    
    document.addEventListener('touchend', (e) => {
      if (!isPulling) return;
      
      const currentY = e.changedTouches[0].clientY;
      const pullDistance = currentY - startY;
      
      if (pullDistance > 80) {
        this._performRefresh();
      }
      
      pullIndicator.classList.remove('active');
      isPulling = false;
      startY = 0;
    }, { passive: true });
  },

  _initSwipeToGoBack() {
    let startX = 0;
    let isSwiping = false;
    let swipeIndicator = null;
    
    // Create swipe indicator
    swipeIndicator = document.createElement('div');
    swipeIndicator.className = 'swipe-back-indicator';
    document.body.appendChild(swipeIndicator);
    
    document.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      if (startX < 20) {
        isSwiping = true;
        swipeIndicator.classList.add('active');
      }
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
      if (!isSwiping) return;
      
      const currentX = e.touches[0].clientX;
      const swipeDistance = currentX - startX;
      
      if (swipeDistance > 0 && swipeDistance < 100) {
        e.preventDefault();
      }
    });
    
    document.addEventListener('touchend', (e) => {
      if (!isSwiping) return;
      
      const currentX = e.changedTouches[0].clientX;
      const swipeDistance = currentX - startX;
      
      if (swipeDistance > 50) {
        this._performGoBack();
      }
      
      swipeIndicator.classList.remove('active');
      isSwiping = false;
      startX = 0;
    }, { passive: true });
  },

  _initHapticFeedback() {
    // Add haptic class to buttons
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn, .bottom-nav-item, .touchable');
      if (btn) {
        btn.classList.add('haptic');
        setTimeout(() => btn.classList.remove('haptic'), 200);
        
        // Trigger haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
      }
    });
  },

  _initTouchFeedback() {
    // Add touchable class to interactive elements
    const interactiveElements = document.querySelectorAll('a, button, .card, .subject-tile, .content-option');
    interactiveElements.forEach(el => {
      if (!el.classList.contains('no-touch')) {
        el.classList.add('touchable');
      }
    });
  },

  _performRefresh() {
    // Reload current page with animation
    this.toast('Refreshing...', '🔄');
    setTimeout(() => location.reload(), 500);
  },

  _performGoBack() {
    // Go back in history
    if (window.history.length > 1) {
      window.history.back();
    } else {
      location.href = 'dashboard.html';
    }
  }
};

// Make sanitize available globally
window.VidyaSec = { sanitize: (text) => App._sanitize(text) };
