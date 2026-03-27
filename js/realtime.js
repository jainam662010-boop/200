/**
 * PRODUCTION-GRADE REAL-TIME UPDATE SYSTEM
 * Event-driven architecture with conflict resolution
 */

class RealTimeManager {
  constructor() {
    this.eventBus = new EventBus();
    this.lastSyncTime = Date.now();
    this.syncQueue = [];
    this.isOnline = navigator.onLine;
    this.retryAttempts = 0;
    this.maxRetries = 3;
    this.syncInterval = 5000; // 5 seconds
    this.heartbeatInterval = 30000; // 30 seconds
    
    // Setup network monitoring
    this.setupNetworkMonitoring();
    
    // Setup heartbeat
    this.startHeartbeat();
  }

  // ===========================================
  // EVENT BUS IMPLEMENTATION
  // ===========================================

  static EventBus = class {
    constructor() {
      this.listeners = new Map();
      this.maxListeners = 50;
    }

    emit(event, data) {
      const handlers = this.listeners.get(event) || [];
      
      // Prevent infinite loops
      if (handlers.length > this.maxListeners) {
        console.warn(`⚠️ Too many listeners for event: ${event}`);
        return;
      }

      handlers.forEach(handler => {
        try {
          // Set timeout to prevent blocking
          setTimeout(() => handler(data), 0);
        } catch (error) {
          console.error(`❌ Event handler error for ${event}:`, error);
          // Remove faulty handler
          this.off(event, handler);
        }
      });
    }

    on(event, handler) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      
      const handlers = this.listeners.get(event);
      if (handlers.length >= this.maxListeners) {
        console.warn(`⚠️ Max listeners reached for event: ${event}`);
        return false;
      }
      
      handlers.push(handler);
      return true;
    }

    off(event, handler) {
      const handlers = this.listeners.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
          return true;
        }
      }
      return false;
    }

    clear(event) {
      if (event) {
        this.listeners.delete(event);
      } else {
        this.listeners.clear();
      }
    }

    getListenerCount(event) {
      return this.listeners.get(event)?.length || 0;
    }
  };

  // ===========================================
  // NETWORK MONITORING
  // ===========================================

  setupNetworkMonitoring() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.eventBus.emit('network:online', { timestamp: Date.now() });
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.eventBus.emit('network:offline', { timestamp: Date.now() });
    });

    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.syncOnPageFocus();
      }
    });
  }

  // ===========================================
  // HEARTBEAT SYSTEM
  // ===========================================

  startHeartbeat() {
    setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatInterval);
  }

  sendHeartbeat() {
    const heartbeat = {
      type: 'heartbeat',
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId()
    };

    this.emitEvent('system:heartbeat', heartbeat);
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('rt_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('rt_session_id', sessionId);
    }
    return sessionId;
  }

  // ===========================================
  // REAL-TIME EVENT EMISSION
  // ===========================================

  emitEvent(eventType, data) {
    const event = {
      id: this.generateEventId(),
      type: eventType,
      timestamp: Date.now(),
      sessionId: this.getSessionId(),
      data: data,
      version: '1.0'
    };

    // Add to sync queue
    this.addToSyncQueue(event);

    // Emit locally
    this.eventBus.emit(eventType, event);

    // Broadcast to other tabs
    this.broadcastEvent(event);

    return event.id;
  }

  generateEventId() {
    return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // ===========================================
  // SYNC QUEUE MANAGEMENT
  // ===========================================

  addToSyncQueue(event) {
    this.syncQueue.push(event);
    
    // Keep only last 100 events
    if (this.syncQueue.length > 100) {
      this.syncQueue = this.syncQueue.slice(-100);
    }

    // Try to sync immediately if online
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  async processSyncQueue() {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    const eventsToSync = [...this.syncQueue];
    this.syncQueue = [];

    try {
      await this.syncEvents(eventsToSync);
      this.retryAttempts = 0;
    } catch (error) {
      console.error('❌ Sync failed:', error);
      
      // Re-add events to queue
      this.syncQueue.unshift(...eventsToSync);
      
      // Retry with exponential backoff
      if (this.retryAttempts < this.maxRetries) {
        this.retryAttempts++;
        const delay = Math.pow(2, this.retryAttempts) * 1000;
        setTimeout(() => this.processSyncQueue(), delay);
      } else {
        console.error('❌ Max retry attempts reached');
        this.eventBus.emit('sync:failed', { 
          events: eventsToSync, 
          error: error.message 
        });
      }
    }
  }

  async syncEvents(events) {
    // Store in localStorage with timestamp
    const existingEvents = JSON.parse(localStorage.getItem('rt_events') || '[]');
    const allEvents = [...existingEvents, ...events];
    
    // Keep only last 500 events
    const trimmedEvents = allEvents.slice(-500);
    
    localStorage.setItem('rt_events', JSON.stringify(trimmedEvents));
    
    // Trigger storage event for cross-tab sync
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'rt_events',
      newValue: JSON.stringify(trimmedEvents)
    }));

    this.lastSyncTime = Date.now();
    this.eventBus.emit('sync:success', { 
      eventsCount: events.length,
      timestamp: this.lastSyncTime 
    });
  }

  // ===========================================
  // CROSS-TAB BROADCASTING
  // ===========================================

  broadcastEvent(event) {
    // Use localStorage for cross-tab communication
    const broadcastKey = 'rt_broadcast_' + event.id;
    localStorage.setItem(broadcastKey, JSON.stringify(event));
    
    // Clean up after 10 seconds
    setTimeout(() => {
      localStorage.removeItem(broadcastKey);
    }, 10000);
  }

  // ===========================================
  // EVENT LISTENERS
  // ===========================================

  on(eventType, handler) {
    return this.eventBus.on(eventType, handler);
  }

  off(eventType, handler) {
    return this.eventBus.off(eventType, handler);
  }

  // ===========================================
  // PAGE FOCUS SYNC
  // ===========================================

  syncOnPageFocus() {
    const lastKnownSync = parseInt(localStorage.getItem('rt_last_sync') || '0');
    
    if (lastKnownSync > this.lastSyncTime) {
      // Another tab has newer data
      this.loadLatestEvents();
    }
  }

  loadLatestEvents() {
    try {
      const events = JSON.parse(localStorage.getItem('rt_events') || '[]');
      const newEvents = events.filter(evt => evt.timestamp > this.lastSyncTime);
      
      newEvents.forEach(event => {
        this.eventBus.emit(event.type, event);
      });
      
      this.lastSyncTime = Date.now();
      localStorage.setItem('rt_last_sync', this.lastSyncTime.toString());
      
    } catch (error) {
      console.error('❌ Failed to load latest events:', error);
    }
  }

  // ===========================================
  // CONFLICT RESOLUTION
  // ===========================================

  resolveConflict(localData, remoteData) {
    // Simple timestamp-based resolution
    // In production, implement more sophisticated conflict resolution
    if (remoteData.timestamp > localData.timestamp) {
      return remoteData;
    }
    return localData;
  }

  // ===========================================
  // STATUS & MONITORING
  // ===========================================

  getStatus() {
    return {
      isOnline: this.isOnline,
      lastSyncTime: this.lastSyncTime,
      queueLength: this.syncQueue.length,
      retryAttempts: this.retryAttempts,
      sessionId: this.getSessionId(),
      listenerCount: this.eventBus.listeners.size
    };
  }

  // ===========================================
  // CLEANUP
  // ===========================================

  destroy() {
    this.eventBus.clear();
    this.syncQueue = [];
  }
}

// Global instance
window.RealTimeManager = new RealTimeManager();
