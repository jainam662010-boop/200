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
    return await window.safeExecute(async () => {
      const data = await this.loadData();
      return data.subjects.find(s => s.id === id) || null;
    }, () => null);
  },

  // Get chapter
  async getChapter(subjectId, chapterId) {
    return await window.safeExecute(async () => {
      const subject = await this.getSubject(subjectId);
      if (subject && subject.chapters) {
        return subject.chapters.find(c => c.id === chapterId) || null;
      }
      return null;
    }, () => null);
  },

  // Safe localStorage operations
  _safeLocalStorage: {
    get(key, defaultValue = null) {
      try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : defaultValue;
      } catch (error) {
        console.warn(`⚠️ Corrupted localStorage key: ${key}`, error);
        localStorage.removeItem(key);
        return defaultValue;
      }
    },
    
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn(`⚠️ Failed to set localStorage key: ${key}`, error);
        return false;
      }
    },
    
    clear(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.warn(`⚠️ Failed to clear localStorage key: ${key}`, error);
        return false;
      }
    }
  },

  // Get profile with validation
  getProfile() {
    return this._safeLocalStorage.get('vm_profile', { name: 'Student' });
  },

  // Get progress with validation
  getProgress() {
    return this._safeLocalStorage.get('vm_progress', {});
  },

  // Get bookmarks with validation
  getBookmarks() {
    return this._safeLocalStorage.get('vm_bm', []);
  },

  // Check if profile exists
  hasProfile() {
    const profile = this.getProfile();
    return profile && profile.name && profile.name !== 'Student';
  },

  // Toggle bookmark
  toggleBookmark(subjectId, chapterId) {
    const bookmarks = this.getBookmarks();
    const bookmarkKey = `${subjectId}::${chapterId}`;
    const index = bookmarks.indexOf(bookmarkKey);
    
    if (index > -1) {
      bookmarks.splice(index, 1);
    } else {
      bookmarks.push(bookmarkKey);
    }
    
    this._safeLocalStorage.set('vm_bm', bookmarks);
    return index === -1;
  },

  // Check if bookmarked
  isBookmarked(subjectId, chapterId) {
    const bookmarks = this.getBookmarks();
    return bookmarks.includes(`${subjectId}::${chapterId}`);
  },

  // Mark as done
  markDone(subjectId, chapterId) {
    const progress = this.getProgress();
    if (!progress[subjectId]) {
      progress[subjectId] = { done: [], scores: {} };
    }
    
    if (!progress[subjectId].done.includes(chapterId)) {
      progress[subjectId].done.push(chapterId);
      progress[subjectId].last = { cid: chapterId, ts: Date.now() };
    }
    
    this._safeLocalStorage.set('vm_progress', progress);
    return true;
  },

  // Check if done
  isDone(subjectId, chapterId) {
    const progress = this.getProgress();
    return progress[subjectId]?.done?.includes(chapterId) || false;
  },

  // Get parameter from URL
  getParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  },

  // Show toast notification
  toast(message, icon = 'ℹ️') {
    // Create toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #1e293b;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      font-family: system-ui;
      font-size: 14px;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
    `;
    toast.textContent = `${icon} ${message}`;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  },

  // Apply theme
  applyMode() {
    const mode = this._safeLocalStorage.get('vm_mode', 'light');
    document.documentElement.setAttribute('data-mode', mode);
  },

  // Toggle mode
  toggleMode() {
    const currentMode = this._safeLocalStorage.get('vm_mode', 'light');
    const newMode = currentMode === 'dark' ? 'light' : 'dark';
    this._safeLocalStorage.set('vm_mode', newMode);
    this.applyMode();
  },

  // Check if dark mode
  isDarkMode() {
    return this._safeLocalStorage.get('vm_mode', 'light') === 'dark';
  },

  // Check if focus mode
  isFocus() {
    return this._safeLocalStorage.get('vm_focus', '0') === '1';
  },

  // Toggle focus mode
  toggleFocus() {
    const currentFocus = this.isFocus();
    this._safeLocalStorage.set('vm_focus', currentFocus ? '0' : '1');
  },

  // Initialize native gestures
  initNativeGestures() {
    // Basic gesture initialization
    console.log('📱 Native gestures initialized');
  },

  // Render bottom navigation
  renderBottomNav(activePage) {
    const bottomNav = document.getElementById('bottomNav');
    if (!bottomNav) return;
    
    const navItems = [
      { id: 'dashboard', icon: '🏠', label: 'Home', href: 'dashboard.html' },
      { id: 'subjects', icon: '📚', label: 'Subjects', href: 'subjects.html' },
      { id: 'todo', icon: '✓', label: 'Tasks', href: '#' },
      { id: 'bookmarks', icon: '🔖', label: 'Saved', href: 'bookmarks.html' },
      { id: 'profile', icon: '👤', label: 'Profile', href: 'profile.html' }
    ];
    
    bottomNav.innerHTML = `
      <nav style="display: flex; justify-content: space-around; padding: 12px 0; background: white; border-top: 1px solid #e2e8f0; position: fixed; bottom: 0; left: 0; right: 0; z-index: 1000;">
        ${navItems.map(item => `
          <a href="${item.href}" style="text-align: center; color: ${item.id === activePage ? '#6366f1' : '#64748b'}; text-decoration: none; padding: 8px; border-radius: 8px; ${item.id === activePage ? 'background: #f0f9ff;' : ''};">
            <div style="font-size: 1.2rem; margin-bottom: 4px;">${item.icon}</div>
            <div style="font-size: 0.8rem;">${item.label}</div>
          </a>
        `).join('')}
      </nav>
    `;
  },

  // Initialize real-time sync (placeholder)
  initRealTimeSync() {
    console.log('🔄 Real-time sync initialized');
  },

  // Get parameter from URL (alias)
  getParameterByName: function(name) {
    return this.getParam(name);
  },

  // Refresh current page (placeholder)
  refreshCurrentPage: function() {
    console.log('🔄 Refreshing page...');
    location.reload();
  }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  await App.init();
});

// Export for global access
window.App = App;
