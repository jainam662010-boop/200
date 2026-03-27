/**
 * CENTRALIZED DATA MANAGER
 * Single source of truth for all app data
 */

class DataManager {
  constructor() {
    this.cache = null;
    this.listeners = [];
    this.initialized = false;
  }

  // Initialize data manager
  async init() {
    if (this.initialized) return this.cache;
    
    try {
      // Load base data
      const baseData = await this.loadBaseData();
      
      // Load admin modifications
      const adminData = this.loadAdminData();
      
      // Merge data
      this.cache = this.mergeData(baseData, adminData);
      
      // Setup real-time sync
      this.setupRealTimeSync();
      
      this.initialized = true;
      console.log('📊 DataManager initialized');
      
      return this.cache;
    } catch (error) {
      console.error('❌ DataManager init failed:', error);
      this.cache = { subjects: [] };
      return this.cache;
    }
  }

  // Load base data from JSON
  async loadBaseData() {
    try {
      const response = await fetch('data/subjects.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.warn('⚠️ Base data load failed:', error.message);
      return { subjects: [] };
    }
  }

  // Load admin data from localStorage
  loadAdminData() {
    try {
      const adminData = localStorage.getItem('vm_app_data');
      return adminData ? JSON.parse(adminData) : { subjects: [], teachers: [], content: {} };
    } catch (error) {
      console.warn('⚠️ Admin data parse failed:', error.message);
      return { subjects: [], teachers: [], content: {} };
    }
  }

  // Merge base data with admin modifications
  mergeData(baseData, adminData) {
    const merged = JSON.parse(JSON.stringify(baseData)); // Deep clone
    
    // Merge subjects
    if (adminData.subjects?.length) {
      adminData.subjects.forEach(adminSubject => {
        const existingIndex = merged.subjects.findIndex(s => s.id === adminSubject.id);
        
        if (existingIndex >= 0) {
          // Update existing subject
          merged.subjects[existingIndex] = {
            ...merged.subjects[existingIndex],
            ...adminSubject,
            id: adminSubject.id || merged.subjects[existingIndex].id
          };
        } else {
          // Add new subject
          merged.subjects.push(this.normalizeSubject(adminSubject));
        }
      });
    }
    
    // Merge lesson-level content
    if (adminData.content) {
      Object.entries(adminData.content).forEach(([lessonId, content]) => {
        const [sid, cid, lid] = lessonId.split('::');
        const subject = merged.subjects.find(s => s.id === sid);
        const chapter = subject?.chapters?.find(c => c.id === cid);
        const lesson = chapter?.lessons?.find(l => l.id === lid);
        
        if (lesson && content) {
          // Add videos
          if (content.videos?.length) {
            lesson.videos = content.videos;
          }
          
          // Add notes
          if (content.notes?.length && !chapter.notes) {
            chapter.notes = content.notes.map(note => ({
              ...note,
              content: note.text || note.pdf?.base64 || note.driveUrl,
              type: note.type || 'text',
              pdfName: note.pdf?.name,
              driveId: note.driveId
            }));
          }
          
          // Add quiz
          if (content.quiz?.length && !chapter.quiz) {
            chapter.quiz = content.quiz;
          }
        }
      });
    }
    
    return merged;
  }

  // Normalize subject data
  normalizeSubject(subject) {
    return {
      id: subject.id || this.slug(subject.name),
      name: subject.name,
      nameHi: subject.nameHi || '',
      icon: subject.icon || '📖',
      description: subject.description || subject.desc || '',
      chapters: subject.chapters || [],
      gradient: subject.gradient || `linear-gradient(135deg,${subject.color||'#6C63FF'},#4F46E5)`,
      glow: subject.glow || 'rgba(108,99,255,.1)',
      bg: subject.bg || 'rgba(108,99,255,.07)',
      border: subject.border || 'rgba(108,99,255,.2)',
      color: subject.color || '#6C63FF'
    };
  }

  // Get data (with caching)
  async getData() {
    if (!this.initialized) {
      await this.init();
    }
    return this.cache;
  }

  // Get specific subject
  async getSubject(id) {
    const data = await this.getData();
    return data.subjects?.find(s => s.id === id) || null;
  }

  // Get specific chapter
  async getChapter(subjectId, chapterId) {
    const subject = await this.getSubject(subjectId);
    return subject?.chapters?.find(c => c.id === chapterId) || null;
  }

  // Save admin data
  saveAdminData(data) {
    try {
      // Validate data
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data structure');
      }
      
      // Create update event
      const updateEvent = {
        type: 'admin_save',
        timestamp: Date.now(),
        sessionId: this.getSessionId(),
        data: this.sanitizeData(data),
        checksum: this.generateChecksum(data)
      };
      
      // Save to localStorage
      localStorage.setItem('vm_app_data', JSON.stringify(data));
      
      // Update cache
      this.cache = this.mergeData(this.cache, data);
      
      // Trigger real-time update
      this.triggerRealTimeUpdate(updateEvent);
      
      // Emit through real-time manager
      if (this.realtime) {
        this.realtime.emitEvent('data:admin_update', updateEvent);
      }
      
      console.log('✅ Admin data saved and synced');
      return true;
    } catch (error) {
      console.error('❌ Save admin data failed:', error);
      return false;
    }
  }

  // Handle admin updates with validation
  handleAdminUpdate(update) {
    console.log('🔄 Processing admin update:', update.type);
    
    try {
      // Validate update
      if (!this.validateUpdate(update)) {
        console.warn('⚠️ Invalid update received:', update);
        return;
      }
      
      // Clear cache to force refresh
      this.cache = null;
      this.initialized = false;
      
      // Notify listeners
      this.notifyListeners(update);
      
      // Show notification
      if (typeof App !== 'undefined' && App.showUpdateNotification) {
        App.showUpdateNotification(`New ${update.type} available!`);
      }
      
    } catch (error) {
      console.error('❌ Handle admin update failed:', error);
    }
  }

  // Validate update integrity
  validateUpdate(update) {
    if (!update || typeof update !== 'object') return false;
    if (!update.type || !update.timestamp) return false;
    if (update.checksum && !this.verifyChecksum(update.data, update.checksum)) {
      console.warn('⚠️ Update checksum mismatch');
      return false;
    }
    return true;
  }

  // Generate data checksum
  generateChecksum(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  // Verify data checksum
  verifyChecksum(data, expectedChecksum) {
    const actualChecksum = this.generateChecksum(data);
    return actualChecksum === expectedChecksum;
  }

  // Sanitize data before saving
  sanitizeData(data) {
    if (!data || typeof data !== 'object') return {};
    
    const sanitized = {};
    
    // Only allow known properties
    const allowedKeys = ['subjects', 'teachers', 'content', 'announcements'];
    allowedKeys.forEach(key => {
      if (data[key] !== undefined) {
        sanitized[key] = data[key];
      }
    });
    
    // Sanitize subjects
    if (sanitized.subjects && Array.isArray(sanitized.subjects)) {
      sanitized.subjects = sanitized.subjects.map(subject => ({
        id: this.sanitizeString(subject.id),
        name: this.sanitizeString(subject.name),
        nameHi: this.sanitizeString(subject.nameHi || ''),
        icon: this.sanitizeString(subject.icon || '📖'),
        description: this.sanitizeString(subject.description || ''),
        chapters: Array.isArray(subject.chapters) ? subject.chapters : [],
        color: this.sanitizeString(subject.color || '#6C63FF'),
        gradient: this.sanitizeString(subject.gradient || ''),
        glow: this.sanitizeString(subject.glow || ''),
        bg: this.sanitizeString(subject.bg || ''),
        border: this.sanitizeString(subject.border || '')
      })).filter(subject => subject.id && subject.name);
    }
    
    return sanitized;
  }

  // Sanitize string values
  sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>]/g, '').trim().substring(0, 1000);
  }

  // Get session ID
  getSessionId() {
    let sessionId = sessionStorage.getItem('dm_session_id');
    if (!sessionId) {
      sessionId = 'dm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('dm_session_id', sessionId);
    }
    return sessionId;
  }

  // Sync data with server (placeholder for future server integration)
  async syncData() {
    try {
      // In production, this would sync with a server
      console.log('🔄 Syncing data with server...');
      
      // For now, just validate local data
      const adminData = this.loadAdminData();
      if (adminData && Object.keys(adminData).length > 0) {
        this.cache = this.mergeData(this.cache, adminData);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Sync data failed:', error);
      return false;
    }
  }

  // Handle sync failures
  handleSyncFailure(errorData) {
    console.error('❌ Sync failure:', errorData);
    
    // Try to recover
    setTimeout(() => {
      this.syncData();
    }, 5000);
  }

  // Setup real-time sync
  setupRealTimeSync() {
    // Initialize real-time manager
    if (window.RealTimeManager) {
      this.realtime = window.RealTimeManager;
      
      // Listen for data updates
      this.realtime.on('data:admin_update', (event) => {
        this.handleAdminUpdate(event.data);
      });
      
      // Listen for network events
      this.realtime.on('network:online', () => {
        console.log('🌐 Network restored - syncing data');
        this.syncData();
      });
      
      // Listen for sync events
      this.realtime.on('sync:success', (event) => {
        console.log('✅ Data sync successful:', event.data);
      });
      
      this.realtime.on('sync:failed', (event) => {
        console.error('❌ Data sync failed:', event.data);
        this.handleSyncFailure(event.data);
      });
    }
    
    // Fallback to storage events
    window.addEventListener('storage', (e) => {
      if (e.key === 'vm_live_updates' && e.newValue) {
        try {
          const updates = JSON.parse(e.newValue);
          const latestUpdate = updates[updates.length - 1];
          if (latestUpdate) {
            this.handleRealTimeUpdate(latestUpdate);
          }
        } catch (error) {
          console.warn('⚠️ Real-time update parse failed:', error);
        }
      }
    });
    
    // Check for pending updates
    const pendingUpdates = this.getPendingUpdates();
    if (pendingUpdates.length > 0) {
      const latestUpdate = pendingUpdates[pendingUpdates.length - 1];
      this.handleRealTimeUpdate(latestUpdate);
    }
  }

  // Handle real-time updates
  handleRealTimeUpdate(update) {
    console.log('🔄 Real-time update received:', update.type);
    
    // Clear cache to force refresh
    this.cache = null;
    this.initialized = false;
    
    // Notify listeners
    this.notifyListeners(update);
    
    // Show notification
    if (typeof App !== 'undefined' && App.showUpdateNotification) {
      App.showUpdateNotification(`New ${update.type} available!`);
    }
  }

  // Trigger real-time update
  triggerRealTimeUpdate(update) {
    try {
      const updates = JSON.parse(localStorage.getItem('vm_live_updates') || '[]');
      updates.push(update);
      
      // Keep only last 10 updates
      if (updates.length > 10) {
        updates.splice(0, updates.length - 10);
      }
      
      localStorage.setItem('vm_live_updates', JSON.stringify(updates));
      
      // Trigger storage event for cross-tab sync
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'vm_live_updates',
        newValue: JSON.stringify(updates)
      }));
    } catch (error) {
      console.error('❌ Trigger real-time update failed:', error);
    }
  }

  // Get pending updates
  getPendingUpdates() {
    try {
      return JSON.parse(localStorage.getItem('vm_live_updates') || '[]');
    } catch (error) {
      return [];
    }
  }

  // Add data change listener
  addListener(callback) {
    this.listeners.push(callback);
  }

  // Remove data change listener
  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Notify all listeners
  notifyListeners(update) {
    this.listeners.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.warn('⚠️ Listener callback failed:', error);
      }
    });
  }

  // Utility: slugify string
  slug(str) {
    return (str || '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Clear all data
  clearAllData() {
    try {
      localStorage.removeItem('vm_app_data');
      localStorage.removeItem('vm_live_updates');
      this.cache = { subjects: [] };
      this.initialized = false;
      console.log('🗑️ All data cleared');
      return true;
    } catch (error) {
      console.error('❌ Clear data failed:', error);
      return false;
    }
  }
}

// Global instance
window.DataManager = new DataManager();
