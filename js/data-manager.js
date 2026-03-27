// Simple Data Manager - Zero Errors Version
'use strict';

const DataManager = {
  // Cache
  cache: { subjects: [] },
  initialized: false,
  
  // Initialize
  async init() {
    try {
      console.log('🔧 Initializing Simple Data Manager...');
      
      // Load data
      await this.loadData();
      this.initialized = true;
      
      console.log('✅ Simple Data Manager initialized');
      return true;
    } catch (error) {
      console.error('❌ Data Manager init failed:', error);
      return false;
    }
  },
  
  // Load data
  async loadData() {
    try {
      // Try to fetch from file
      const response = await fetch('data/subjects.json');
      if (response.ok) {
        this.cache = await response.json();
        console.log('✅ Data loaded from file');
        return;
      }
    } catch (error) {
      console.warn('⚠️ Could not load from file, using fallback');
    }
    
    // Fallback data
    this.cache = {
      subjects: [
        {
          id: 'math',
          name: 'Mathematics',
          icon: '🔢',
          color: '#f59e0b',
          bg: '#fffbeb',
          gradient: 'linear-gradient(135deg, #f59e0b, #f97316)',
          chapters: [
            { id: '1', title: 'Real Numbers', lessons: 5 },
            { id: '2', title: 'Polynomials', lessons: 4 },
            { id: '3', title: 'Linear Equations', lessons: 6 }
          ]
        },
        {
          id: 'science',
          name: 'Science',
          icon: '🔬',
          color: '#10b981',
          bg: '#ecfdf5',
          gradient: 'linear-gradient(135deg, #10b981, #059669)',
          chapters: [
            { id: '1', title: 'Chemical Reactions', lessons: 4 },
            { id: '2', title: 'Acids and Bases', lessons: 5 },
            { id: '3', title: 'Metals and Non-metals', lessons: 6 }
          ]
        },
        {
          id: 'english',
          name: 'English',
          icon: '📖',
          color: '#3b82f6',
          bg: '#eff6ff',
          gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          chapters: [
            { id: '1', title: 'Reading Comprehension', lessons: 3 },
            { id: '2', title: 'Writing Skills', lessons: 4 },
            { id: '3', title: 'Grammar', lessons: 5 }
          ]
        }
      ]
    };
    
    console.log('✅ Using fallback data');
  },
  
  // Get all data
  async getData() {
    if (!this.initialized) {
      await this.init();
    }
    return this.cache;
  },
  
  // Get subject
  async getSubject(id) {
    const data = await this.getData();
    return data.subjects.find(s => s.id === id) || null;
  },
  
  // Get chapter
  async getChapter(subjectId, chapterId) {
    const subject = await this.getSubject(subjectId);
    if (subject && subject.chapters) {
      return subject.chapters.find(c => c.id === chapterId) || null;
    }
    return null;
  },
  
  // Clear cache
  clearCache() {
    this.cache = { subjects: [] };
    this.initialized = false;
    console.log('🗑️ Cache cleared');
  }
};

// Global instance
window.DataManager = DataManager;
