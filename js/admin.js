const Admin = {
  // NEW: Unified data structure
  appData: {
    subjects: [],
    teachers: [],
    content: {} // content[lessonId] = {videos, notes, shortNotes, mindmaps, pyqs, animations, quiz}
  },
  activeSection: 'dashboard',
  _editCtx: { sid: '', cid: '', lid: '' },
  
  config: {
    dashboard: {
      label: 'Dashboard', icon: '📊',
      render: (panel) => {
        const stats = Admin.calculateStats();
        panel.innerHTML = `
          <div class="admin-header">
            <h1>Welcome, Teacher! 👋</h1>
            <p class="subtitle">Manage all your educational content from one place</p>
          </div>
          
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon">📚</div>
              <div class="stat-info">
                <div class="stat-value">${stats.subjects}</div>
                <div class="stat-label">Subjects</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">📖</div>
              <div class="stat-info">
                <div class="stat-value">${stats.chapters}</div>
                <div class="stat-label">Chapters</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🎬</div>
              <div class="stat-info">
                <div class="stat-value">${stats.lessons}</div>
                <div class="stat-label">Lessons</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">�‍🏫</div>
              <div class="stat-info">
                <div class="stat-value">${stats.teachers}</div>
                <div class="stat-label">Teachers</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🎬</div>
              <div class="stat-info">
                <div class="stat-value">${stats.videos}</div>
                <div class="stat-label">Videos</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">�</div>
              <div class="stat-info">
                <div class="stat-value">${stats.notes}</div>
                <div class="stat-label">Notes</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🧩</div>
              <div class="stat-info">
                <div class="stat-value">${stats.quizzes}</div>
                <div class="stat-label">Quiz</div>
              </div>
            </div>
          </div>
          
          <div class="quick-actions">
            <h3>⚡ Quick Actions</h3>
            <div class="quick-grid">
              <button class="quick-card" onclick="Admin.switchSection('subjects')">
                <div class="quick-icon">�</div>
                <div class="quick-label">Manage Subjects</div>
              </button>
              <button class="quick-card" onclick="Admin.switchSection('teachers')">
                <div class="quick-icon">�‍🏫</div>
                <div class="quick-label">Manage Teachers</div>
              </button>
              <button class="quick-card" onclick="Admin.switchSection('content')">
                <div class="quick-icon">📝</div>
                <div class="quick-label">Add Content</div>
              </button>
              <button class="quick-card" onclick="Admin.switchSection('quiz')">
                <div class="quick-icon">🧩</div>
                <div class="quick-label">Quiz Bank</div>
              </button>
            </div>
          </div>
        `;
      }
    },

    // NEW: Subject Management
    subjects: {
      label: 'Subjects', icon: '�',
      render: (panel) => Admin.renderSubjectsManager(panel)
    },

    // NEW: Teacher Management  
    teachers: {
      label: 'Teachers', icon: '�‍🏫',
      render: (panel) => Admin.renderTeachersManager(panel)
    },

    // NEW: Content Management
    content: {
      label: 'Content', icon: '�',
      render: (panel) => Admin.renderContentManager(panel)
    },

    // RESTRUCTURED: Quiz Management
    quiz: {
      label: 'Quiz Bank', icon: '🧩',
      render: (panel) => Admin.renderQuizManager(panel)
    },
    
    settings: {
      label: 'Settings', icon: '⚙️',
      render: (panel) => {
        panel.innerHTML = `
          <div class="admin-header">
            <h1>Settings</h1>
            <p class="subtitle">Manage your admin preferences</p>
          </div>
          
          <div class="settings-grid">
            <div class="setting-card">
              <h3>💾 Data Management</h3>
              <div class="setting-actions">
                <button class="btn btn-primary" onclick="Admin.exportData()">
                  📥 Export All Data
                </button>
                <button class="btn btn-secondary" onclick="Admin.clearAllData()">
                  🗑️ Clear All Data
                </button>
              </div>
            </div>
            
            <div class="setting-card">
              <h3>🔐 Security</h3>
              <div class="setting-actions">
                <button class="btn btn-secondary" onclick="Admin.logout()">
                  🚪 Logout
                </button>
              </div>
            </div>
          </div>
        `;
      }
    }
  },

  init() {
    if (!this.checkLogin()) return;
    this.initRealTimeSync(); // Initialize real-time updates
    this.initMobileGestures(); // Initialize mobile swipe gestures
    this.loadData().then(() => {
      this.loadSubjectsAndChapters();
      this.renderNav();
      this.renderPanels();
      this.switchSection(this.activeSection);
    });
  },

  // Mobile touch gestures for navigation drawer
  initMobileGestures() {
    const nav = document.getElementById('adminNav');
    if (!nav) return;
    
    let touchStartX = 0;
    let touchEndX = 0;
    
    // Handle touch start
    nav.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    // Handle touch end - detect swipe left to close
    nav.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      this.handleSwipe(touchStartX, touchEndX);
    }, { passive: true });
  },

  handleSwipe(startX, endX) {
    const swipeThreshold = 100; // Minimum distance for swipe
    const diff = startX - endX;
    
    // Swipe left to close menu
    if (diff > swipeThreshold) {
      this.closeMobileNav();
    }
  },

  loadSubjectsAndChapters() {
    this.subjects = this.data.subjects || [];
    this.chapters = [];
    this.subjects.forEach(subj => {
      if (subj.chapters) {
        subj.chapters.forEach(ch => {
          this.chapters.push({
            id: ch.id,
            title: ch.title,
            subjectId: subj.id,
            subjectName: subj.name
          });
        });
      }
    });
  },

  calculateStats() {
    return {
      subjects: this.data.subjects?.length || 0,
      chapters: this.chapters.length,
      videos: (this.data.videos || []).length,
      pdfs: (this.data.pdfs || []).length,
      quizzes: (this.data.quiz || []).length,
      teachers: (this.data.teachers || []).length
    };
  },

  renderNav() {
    const navEl = document.getElementById('adminNavLinks');
    const html = Object.keys(this.config).map(sectionId => {
      const section = this.config[sectionId];
      return `
        <div class="al-link ${this.activeSection === sectionId ? 'on' : ''}" 
             id="al-${sectionId}" 
             onclick="Admin.switchSection('${sectionId}')">
          <span class="al-icon">${section.icon}</span>
          <span class="al-label">${section.label}</span>
        </div>
      `;
    }).join('');
    navEl.innerHTML = html;
  },

  renderPanels() {
    const panelsEl = document.getElementById('adminPanels');
    let html = '';
    for (const sectionId in this.config) {
      html += `<div class="a-panel ${this.activeSection === sectionId ? 'on' : ''}" id="ap-${sectionId}"></div>`;
    }
    panelsEl.innerHTML = html;
  },

  switchSection(sectionId) {
    this.activeSection = sectionId;
    document.querySelectorAll('.al-link').forEach(el => el.classList.remove('on'));
    document.getElementById(`al-${sectionId}`)?.classList.add('on');

    document.querySelectorAll('.a-panel').forEach(el => el.classList.remove('on'));
    const panel = document.getElementById(`ap-${sectionId}`);
    panel?.classList.add('on');

    // Close mobile navigation when switching sections
    this.closeMobileNav();

    const section = this.config[sectionId];
    if (section?.render) {
      section.render(panel);
    }
  },

  showContentForm(type) {
    const formArea = document.getElementById('contentFormArea');
    if (!formArea) return;
    
    const getSubjectOptions = () => this.subjects.map(s => 
      `<option value="${s.id}">${s.icon || '📚'} ${s.name}</option>`
    ).join('');
    
    const forms = {
      video: `
        <div class="form-card">
          <h3>🎬 Add Video Lesson</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>Subject *</label>
              <select class="fc" id="videoSubject" onchange="Admin.loadChapters('videoSubject', 'videoChapter')">
                <option value="">Select Subject</option>
                ${getSubjectOptions()}
              </select>
            </div>
            <div class="form-group">
              <label>Chapter *</label>
              <select class="fc" id="videoChapter">
                <option value="">Select Chapter</option>
              </select>
            </div>
            <div class="form-group full-width">
              <label>Video Title *</label>
              <input type="text" class="fc" id="videoTitle" placeholder="e.g., Introduction to Trigonometry">
            </div>
            <div class="form-group full-width">
              <label>YouTube Video ID or URL *</label>
              <input type="text" class="fc" id="videoUrl" placeholder="e.g., dQw4w9WgXcQ or full URL">
              <small class="form-help">Paste full YouTube URL or just video ID</small>
            </div>
            <div class="form-group">
              <label>Teacher</label>
              <select class="fc" id="videoTeacher">
                <option value="">Select Teacher</option>
                ${this.getTeacherOptions()}
              </select>
            </div>
            <div class="form-group">
              <label>Video Type</label>
              <select class="fc" id="videoType">
                <option value="oneshot">One Shot</option>
                <option value="revision">Revision</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" onclick="Admin.saveVideo()">💾 Save Video</button>
            <button class="btn btn-secondary" onclick="Admin.previewVideo()">👁️ Preview</button>
          </div>
        </div>
      `,
      
      pdf: `
        <div class="form-card">
          <h3>📄 Add PDF Document</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>Subject *</label>
              <select class="fc" id="pdfSubject" onchange="Admin.loadChapters('pdfSubject', 'pdfChapter')">
                <option value="">Select Subject</option>
                ${getSubjectOptions()}
              </select>
            </div>
            <div class="form-group">
              <label>Chapter</label>
              <select class="fc" id="pdfChapter">
                <option value="">All Chapters</option>
              </select>
            </div>
            <div class="form-group full-width">
              <label>PDF Name *</label>
              <input type="text" class="fc" id="pdfName" placeholder="e.g., NCERT Solutions">
            </div>
            <div class="form-group full-width">
              <label>PDF URL *</label>
              <input type="url" class="fc" id="pdfUrl" placeholder="https://example.com/doc.pdf">
            </div>
            <div class="form-group">
              <label>Category</label>
              <select class="fc" id="pdfCategory">
                <option value="notes">Notes</option>
                <option value="worksheet">Worksheet</option>
                <option value="solution">Solutions</option>
                <option value="pyq">PYQ</option>
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" onclick="Admin.savePDF()">💾 Save PDF</button>
          </div>
        </div>
      `,
      
      quiz: `
        <div class="form-card">
          <h3>🧩 Add Quiz Question</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>Subject *</label>
              <select class="fc" id="quizSubject" onchange="Admin.loadChapters('quizSubject', 'quizChapter')">
                <option value="">Select Subject</option>
                ${getSubjectOptions()}
              </select>
            </div>
            <div class="form-group">
              <label>Chapter *</label>
              <select class="fc" id="quizChapter">
                <option value="">Select Chapter</option>
              </select>
            </div>
            <div class="form-group full-width">
              <label>Question *</label>
              <textarea class="fc" id="quizQuestion" rows="3" placeholder="Enter question..."></textarea>
            </div>
            <div class="form-group full-width">
              <label>Options * (one per line)</label>
              <textarea class="fc" id="quizOptions" rows="4" placeholder="Option A&#10;Option B&#10;Option C&#10;Option D"></textarea>
            </div>
            <div class="form-group">
              <label>Correct Answer *</label>
              <select class="fc" id="quizAnswer">
                <option value="0">A</option>
                <option value="1">B</option>
                <option value="2">C</option>
                <option value="3">D</option>
              </select>
            </div>
            <div class="form-group">
              <label>Difficulty</label>
              <select class="fc" id="quizDifficulty">
                <option value="easy">Easy</option>
                <option value="medium" selected>Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" onclick="Admin.saveQuiz()">💾 Save & Next</button>
            <button class="btn btn-gh" onclick="Admin.saveQuiz(); Admin.showContentForm('quiz')">➕ Save & Add Another</button>
          </div>
        </div>
      `,
      
      pyq: `
        <div class="form-card">
          <h3>📋 Add Previous Year Question</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>Subject *</label>
              <select class="fc" id="pyqSubject">
                <option value="">Select Subject</option>
                ${getSubjectOptions()}
              </select>
            </div>
            <div class="form-group">
              <label>Year *</label>
              <select class="fc" id="pyqYear">
                <option value="">Select Year</option>
                ${[2024,2023,2022,2021,2020,2019,2018].map(y => `<option value="${y}">${y}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Board</label>
              <select class="fc" id="pyqBoard">
                <option value="cbse">CBSE</option>
                <option value="icse">ICSE</option>
                <option value="state">State</option>
              </select>
            </div>
            <div class="form-group full-width">
              <label>Question *</label>
              <textarea class="fc" id="pyqQuestion" rows="4" placeholder="Enter question..."></textarea>
            </div>
            <div class="form-group full-width">
              <label>Solution *</label>
              <textarea class="fc" id="pyqSolution" rows="6" placeholder="Enter solution..."></textarea>
            </div>
            <div class="form-group">
              <label>Marks</label>
              <input type="number" class="fc" id="pyqMarks" placeholder="e.g., 5">
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" onclick="Admin.savePYQ()">💾 Save PYQ</button>
          </div>
        </div>
      `,
      
      paper: `
        <div class="form-card">
          <h3>📑 Add Question Paper</h3>
          <div class="form-grid">
            <div class="form-group full-width">
              <label>Title *</label>
              <input type="text" class="fc" id="paperTitle" placeholder="e.g., CBSE Sample Paper 2024">
            </div>
            <div class="form-group">
              <label>Subject *</label>
              <select class="fc" id="paperSubject">
                <option value="">Select Subject</option>
                ${getSubjectOptions()}
              </select>
            </div>
            <div class="form-group">
              <label>Year</label>
              <input type="number" class="fc" id="paperYear" placeholder="2024">
            </div>
            <div class="form-group">
              <label>Type</label>
              <select class="fc" id="paperType">
                <option value="sample">Sample</option>
                <option value="board">Board</option>
                <option value="preboard">Pre-Board</option>
                <option value="mock">Mock</option>
              </select>
            </div>
            <div class="form-group full-width">
              <label>PDF URL *</label>
              <input type="url" class="fc" id="paperUrl" placeholder="https://example.com/paper.pdf">
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" onclick="Admin.savePaper()">💾 Save Paper</button>
          </div>
        </div>
      `
    };
    
    formArea.innerHTML = forms[type] || '';
    formArea.scrollIntoView({ behavior: 'smooth' });
  },

  loadChapters(subjectSelectId, chapterSelectId) {
    const subjectId = document.getElementById(subjectSelectId).value;
    const chapterSelect = document.getElementById(chapterSelectId);
    const subject = this.subjects.find(s => s.id === subjectId);
    
    if (subject?.chapters) {
      chapterSelect.innerHTML = `
        <option value="">Select Chapter</option>
        ${subject.chapters.map(ch => `<option value="${ch.id}">${ch.title}</option>`).join('')}
      `;
    }
  },

  getTeacherOptions() {
    return (this.data.teachers || []).map(t => 
      `<option value="${t.name}::${t.channel}">${t.name}</option>`
    ).join('');
  },

  saveVideo() {
    const videoId = this.extractVideoId(document.getElementById('videoUrl').value);
    if (!videoId) { alert('Please enter a valid YouTube URL or video ID'); return; }
    
    const video = {
      id: 'vid_' + Date.now(),
      subject: document.getElementById('videoSubject').value,
      chapter: document.getElementById('videoChapter').value,
      title: document.getElementById('videoTitle').value,
      videoId: videoId,
      teacher: document.getElementById('videoTeacher').value,
      type: document.getElementById('videoType').value,
      createdAt: new Date().toISOString()
    };
    
    if (!video.subject || !video.chapter || !video.title) {
      alert('Please fill all required fields (*)!'); return;
    }
    
    if (!this.data.videos) this.data.videos = [];
    this.data.videos.push(video);
    this.saveData();
    alert('✅ Video saved successfully!');
    document.getElementById('videoTitle').value = '';
    document.getElementById('videoUrl').value = '';
  },

  savePDF() {
    const pdf = {
      id: 'pdf_' + Date.now(),
      subject: document.getElementById('pdfSubject').value,
      chapter: document.getElementById('pdfChapter').value,
      name: document.getElementById('pdfName').value,
      url: document.getElementById('pdfUrl').value,
      category: document.getElementById('pdfCategory').value,
      createdAt: new Date().toISOString()
    };
    
    if (!pdf.subject || !pdf.name || !pdf.url) {
      alert('Please fill all required fields (*)!'); return;
    }
    
    if (!this.data.pdfs) this.data.pdfs = [];
    this.data.pdfs.push(pdf);
    this.saveData();
    alert('✅ PDF saved successfully!');
    this.switchSection('pdfs');
  },

  saveQuiz() {
    const optionsText = document.getElementById('quizOptions').value;
    const options = optionsText.split('\n').filter(o => o.trim());
    
    if (options.length < 2) { alert('Please provide at least 2 options'); return; }
    
    const quiz = {
      id: 'quiz_' + Date.now(),
      subject: document.getElementById('quizSubject').value,
      chapter: document.getElementById('quizChapter').value,
      q: document.getElementById('quizQuestion').value,
      options: options,
      ans: parseInt(document.getElementById('quizAnswer').value),
      difficulty: document.getElementById('quizDifficulty').value,
      createdAt: new Date().toISOString()
    };
    
    if (!quiz.subject || !quiz.chapter || !quiz.q) {
      alert('Please fill all required fields (*)!'); return;
    }
    
    if (!this.data.quiz) this.data.quiz = [];
    this.data.quiz.push(quiz);
    this.saveData();
    alert('✅ Quiz question saved!');
  },

  savePYQ() {
    const pyq = {
      id: 'pyq_' + Date.now(),
      subject: document.getElementById('pyqSubject').value,
      year: document.getElementById('pyqYear').value,
      board: document.getElementById('pyqBoard').value,
      question: document.getElementById('pyqQuestion').value,
      solution: document.getElementById('pyqSolution').value,
      marks: document.getElementById('pyqMarks').value,
      createdAt: new Date().toISOString()
    };
    
    if (!pyq.subject || !pyq.year || !pyq.question || !pyq.solution) {
      alert('Please fill all required fields (*)!'); return;
    }
    
    if (!this.data.pyqs) this.data.pyqs = [];
    this.data.pyqs.push(pyq);
    this.saveData();
    alert('✅ PYQ saved successfully!');
    this.switchSection('pyqs');
  },

  savePaper() {
    const paper = {
      id: 'paper_' + Date.now(),
      title: document.getElementById('paperTitle').value,
      subject: document.getElementById('paperSubject').value,
      year: document.getElementById('paperYear').value,
      type: document.getElementById('paperType').value,
      url: document.getElementById('paperUrl').value,
      createdAt: new Date().toISOString()
    };
    
    if (!paper.title || !paper.subject || !paper.url) {
      alert('Please fill all required fields (*)!'); return;
    }
    
    if (!this.data.papers) this.data.papers = [];
    this.data.papers.push(paper);
    this.saveData();
    alert('✅ Question paper saved successfully!');
    this.switchSection('papers');
  },

  extractVideoId(url) {
    if (!url) return null;
    if (url.length === 11 && !url.includes('/')) return url;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/);
    return match ? match[1] : null;
  },

  previewVideo() {
    const videoId = this.extractVideoId(document.getElementById('videoUrl').value);
    if (videoId) { window.open(`https://youtube.com/watch?v=${videoId}`, '_blank'); }
    else { alert('Please enter a valid YouTube URL first'); }
  },

  tryLogin() {
    const pass = document.getElementById('adminPass').value;
    if (pass === '6610') {
      localStorage.setItem('vm_admin_key', pass);
      this.init();
    } else {
      document.getElementById('loginErr').textContent = 'Invalid Access Key';
    }
  },

  logout() {
    localStorage.removeItem('vm_admin_key');
    window.location.reload();
  },

  // NEW: Unified data loading
  async loadData() {
    try {
      // Load base subjects structure
      const response = await fetch('data/subjects.json');
      const baseData = await response.json();
      
      // Load admin modifications
      const adminData = JSON.parse(localStorage.getItem('vm_app_data') || '{}');
      
      // Merge: base structure + admin modifications
      this.appData = {
        subjects: adminData.subjects || baseData.subjects || [],
        teachers: adminData.teachers || [],
        content: adminData.content || {}
      };
      
      // Backward compatibility
      this.data = this.appData;
      this.subjects = this.appData.subjects;
      this.chapters = this._getAllChapters();
    } catch (e) {
      console.error("Failed to load data", e);
      // Fallback to localStorage only
      const adminData = JSON.parse(localStorage.getItem('vm_app_data') || '{}');
      this.appData = {
        subjects: adminData.subjects || [],
        teachers: adminData.teachers || [],
        content: adminData.content || {}
      };
      this.data = this.appData;
      this.subjects = this.appData.subjects;
      this.chapters = this._getAllChapters();
    }
  },

  // NEW: Save unified data with real-time sync
  saveData() {
    try {
      console.log('🔄 Admin saving data...');
      
      // Validate data before saving
      if (!this.validateAdminData(this.appData)) {
        throw new Error('Data validation failed');
      }
      
      // Save through data manager for consistency
      if (window.DataManager) {
        const success = window.DataManager.saveAdminData(this.appData);
        if (success) {
          // Show success notification
          this.showNotification('Data saved successfully!', 'success');
          console.log('✅ Admin data saved through DataManager');
          
          // Log the save event
          this.logAdminAction('save_data', {
            subjectsCount: this.appData.subjects?.length || 0,
            contentCount: Object.keys(this.appData.content || {}).length,
            timestamp: Date.now()
          });
          
        } else {
          throw new Error('DataManager save failed');
        }
      } else {
        // Fallback to direct localStorage
        localStorage.setItem('vm_app_data', JSON.stringify(this.appData));
        this.showNotification('Data saved (fallback mode)', 'warning');
        console.log('⚠️ Admin data saved directly (fallback)');
      }
      
      // Update backward compatibility references
      this.data = this.appData;
      this.subjects = this.appData.subjects;
      this.chapters = this._getAllChapters();
      
    } catch (error) {
      console.error('❌ Save data failed:', error);
      this.showNotification('Failed to save data: ' + error.message, 'error');
      
      // Log error
      this.logAdminAction('save_error', {
        error: error.message,
        timestamp: Date.now()
      });
    }
  },

  // Validate admin data before saving
  validateAdminData(data) {
    if (!data || typeof data !== 'object') {
      console.error('❌ Invalid data structure');
      return false;
    }
    
    // Validate subjects
    if (data.subjects && Array.isArray(data.subjects)) {
      for (let i = 0; i < data.subjects.length; i++) {
        const subject = data.subjects[i];
        if (!subject.id || !subject.name) {
          console.error(`❌ Invalid subject at index ${i}: missing id or name`);
          return false;
        }
        
        // Validate chapters
        if (subject.chapters && Array.isArray(subject.chapters)) {
          for (let j = 0; j < subject.chapters.length; j++) {
            const chapter = subject.chapters[j];
            if (!chapter.id || !chapter.title) {
              console.error(`❌ Invalid chapter at subject ${subject.id}, index ${j}: missing id or title`);
              return false;
            }
          }
        }
      }
    }
    
    return true;
  },

  // Show admin notification
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `admin-notification admin-notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">${this.getNotificationIcon(type)}</span>
        <span class="notification-text">${message}</span>
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">✕</button>
      </div>
    `;
    
    // Add styles if not exists
    if (!document.querySelector('#admin-notification-styles')) {
      const styles = document.createElement('style');
      styles.id = 'admin-notification-styles';
      styles.textContent = `
        .admin-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 16px 20px;
          border-radius: 8px;
          color: white;
          font-weight: 500;
          z-index: 10001;
          animation: slideInRight 0.3s ease;
          max-width: 400px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        .admin-notification-success { background: #10b981; }
        .admin-notification-error { background: #ef4444; }
        .admin-notification-warning { background: #f59e0b; }
        .admin-notification-info { background: #3b82f6; }
        .notification-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .notification-icon { font-size: 18px; }
        .notification-text { flex: 1; font-size: 14px; }
        .notification-close {
          background: none;
          border: none;
          color: white;
          font-size: 16px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        .notification-close:hover { background: rgba(255,255,255,0.2); }
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
  },

  // Get notification icon
  getNotificationIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || icons.info;
  },

  // Log admin actions
  logAdminAction(action, data) {
    try {
      const logs = JSON.parse(localStorage.getItem('vm_admin_logs') || '[]');
      logs.push({
        action,
        data,
        timestamp: Date.now(),
        sessionId: this.getAdminSessionId()
      });
      
      // Keep only last 100 logs
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem('vm_admin_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('❌ Failed to log admin action:', error);
    }
  },

  // Get admin session ID
  getAdminSessionId() {
    let sessionId = sessionStorage.getItem('admin_session_id');
    if (!sessionId) {
      sessionId = 'admin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('admin_session_id', sessionId);
    }
    return sessionId;
  },

  // NEW: Helper to get all chapters
  _getAllChapters() {
    const chapters = [];
    this.appData.subjects.forEach(subj => {
      if (subj.chapters) {
        subj.chapters.forEach(ch => {
          chapters.push({
            id: ch.id,
            title: ch.title,
            subjectId: subj.id,
            subjectName: subj.name
          });
        });
      }
    });
    return chapters;
  },

  // NEW: Calculate stats from unified data
  calculateStats() {
    let totalLessons = 0;
    let totalVideos = 0;
    let totalNotes = 0;
    let totalQuizzes = 0;
    
    // Count lessons and content
    Object.values(this.appData.content).forEach(lessonContent => {
      totalVideos += (lessonContent.videos || []).length;
      totalNotes += (lessonContent.notes || []).length;
      totalQuizzes += (lessonContent.quiz || []).length;
    });
    
    // Count lessons from structure
    this.appData.subjects.forEach(subj => {
      if (subj.chapters) {
        subj.chapters.forEach(ch => {
          if (ch.lessons) {
            totalLessons += ch.lessons.length;
          }
        });
      }
    });
    
    return {
      subjects: this.appData.subjects.length,
      chapters: this.chapters.length,
      lessons: totalLessons,
      teachers: this.appData.teachers.length,
      videos: totalVideos,
      notes: totalNotes,
      quizzes: totalQuizzes
    };
  },

  _parseLS(k, def) {
    try {
      return JSON.parse(localStorage.getItem(k) || 'null') ?? def;
    } catch {
      return def;
    }
  },

  _saveLS(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },

  _getOverrides() {
    return this._parseLS('vm_overrides', {});
  },

  _setOverride(sid, cid, patch) {
    const ov = this._getOverrides();
    const key = `${sid}::${cid}`;
    ov[key] = { ...(ov[key] || {}), ...patch };
    this._saveLS('vm_overrides', ov);
  },

  _setLessonPatch(sid, cid, lid, patch) {
    const ov = this._getOverrides();
    const key = `${sid}::${cid}`;
    const cur = ov[key] || {};
    const lp = cur.lessonPatches || {};
    lp[lid] = { ...(lp[lid] || {}), ...patch };
    ov[key] = { ...cur, lessonPatches: lp };
    this._saveLS('vm_overrides', ov);
  },

  renderLessonEditor(panel) {
    panel.innerHTML = `
      <div class="admin-header">
        <h1>📝 Lesson Editor</h1>
        <p class="subtitle">Choose a lesson and update video, notes, quiz, PYQs and papers</p>
      </div>

      <div class="form-card">
        <h3>Select Lesson</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>Subject</label>
            <select class="fc" id="leSubject" onchange="Admin.leLoadChapters()">
              <option value="">Select Subject</option>
              ${(this.subjects || []).map(s => `<option value="${s.id}">${(s.icon || '📚')} ${s.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Chapter</label>
            <select class="fc" id="leChapter" onchange="Admin.leLoadLessons()">
              <option value="">Select Chapter</option>
            </select>
          </div>
          <div class="form-group">
            <label>Lesson</label>
            <select class="fc" id="leLesson" onchange="Admin.leLoadLessonData()">
              <option value="">Select Lesson</option>
            </select>
          </div>
        </div>
      </div>

      <div id="leEditor" style="display:none">
        <div class="form-card">
          <h3>🎬 YouTube Video</h3>
          <div class="form-grid">
            <div class="form-group full-width">
              <label>YouTube URL or ID</label>
              <input class="fc" id="leVideo" placeholder="https://youtube.com/watch?v=... or dQw4w9WgXcQ">
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-secondary" onclick="Admin.lePreviewVideo()">Preview</button>
            <button class="btn btn-primary" onclick="Admin.leSaveVideo()">Save Video</button>
          </div>
        </div>

        <div class="form-card">
          <h3>📝 Notes</h3>
          <div class="form-group full-width">
            <label>Notes Text</label>
            <textarea class="fc" id="leNotesText" rows="8" placeholder="Write notes here..."></textarea>
          </div>
          <div class="form-group full-width">
            <label>Notes PDF URL</label>
            <input class="fc" id="leNotesPdfUrl" placeholder="https://drive.google.com/...">
          </div>
          <div class="form-group full-width">
            <label>Upload Notes PDF (Max 1MB)</label>
            <input type="file" class="fc" id="leNotesFile" accept=".pdf" onchange="Admin.uploadNotesPdf()">
            <div class="form-help">Or upload a small PDF file directly (base64 encoded, under 1MB)</div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" onclick="Admin.leSaveNotes()">Save Notes</button>
          </div>
        </div>

        <div class="form-card">
          <h3>🧩 Quiz (per chapter)</h3>
          <div class="form-group full-width">
            <label>Quiz Text (one question per line)</label>
            <textarea class="fc" id="leQuizText" rows="8" placeholder="Question?*Option1*Option2*Option3*Option4*CorrectIndex(0-3)"></textarea>
            <div class="form-help">Example: What is 2+2?*2*3*4*5*2</div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" onclick="Admin.leSaveQuiz()">Save Quiz</button>
          </div>
        </div>

        <div class="form-card">
          <h3>📋 PYQs</h3>
          <div class="form-group full-width">
            <label>PYQ Text</label>
            <textarea class="fc" id="lePyqText" rows="6" placeholder="Paste PYQs here..."></textarea>
          </div>
          <div class="form-group full-width">
            <label>PYQ PDF URL</label>
            <input class="fc" id="lePyqUrl" placeholder="https://...">
          </div>
          <div class="form-group full-width">
            <label>Upload PYQ PDF (Max 1MB)</label>
            <input type="file" class="fc" id="lePyqFile" accept=".pdf" onchange="Admin.uploadPyqPdf()">
            <div class="form-help">Upload small PDF directly (base64 encoded, under 1MB)</div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" onclick="Admin.leSavePyq()">Save PYQs</button>
          </div>
        </div>

        <div class="form-card">
          <h3>📑 Question Paper</h3>
          <div class="form-group full-width">
            <label>Paper Text</label>
            <textarea class="fc" id="lePaperText" rows="6" placeholder="Paste question paper here..."></textarea>
          </div>
          <div class="form-group full-width">
            <label>Paper PDF URL</label>
            <input class="fc" id="lePaperUrl" placeholder="https://...">
          </div>
          <div class="form-group full-width">
            <label>Upload Paper PDF (Max 1MB)</label>
            <input type="file" class="fc" id="lePaperFile" accept=".pdf" onchange="Admin.uploadPaperPdf()">
            <div class="form-help">Upload small PDF directly (base64 encoded, under 1MB)</div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" onclick="Admin.leSavePaper()">Save Paper</button>
          </div>
        </div>
      </div>
    `;
  },

  leLoadChapters() {
    const sid = document.getElementById('leSubject')?.value || '';
    const chSel = document.getElementById('leChapter');
    const lsSel = document.getElementById('leLesson');
    const ed = document.getElementById('leEditor');
    if (ed) ed.style.display = 'none';
    if (lsSel) lsSel.innerHTML = '<option value="">Select Lesson</option>';
    const subj = (this.subjects || []).find(s => s.id === sid);
    if (!chSel) return;
    if (!subj?.chapters?.length) {
      chSel.innerHTML = '<option value="">Select Chapter</option>';
      return;
    }
    chSel.innerHTML = `<option value="">Select Chapter</option>${subj.chapters.map(ch => `<option value="${ch.id}">${ch.title}</option>`).join('')}`;
  },

  leLoadLessons() {
    const sid = document.getElementById('leSubject')?.value || '';
    const cid = document.getElementById('leChapter')?.value || '';
    const subj = (this.subjects || []).find(s => s.id === sid);
    const ch = (subj?.chapters || []).find(c => c.id === cid);
    const lsSel = document.getElementById('leLesson');
    const ed = document.getElementById('leEditor');
    if (ed) ed.style.display = 'none';
    if (!lsSel) return;
    const lessons = (ch?.lessons || []).map(l => ({ ...l, id: l.id || (l.title ? this._slug(l.title) : '') }));
    lsSel.innerHTML = `<option value="">Select Lesson</option>${lessons.map(l => `<option value="${l.id}">${l.title || l.id}</option>`).join('')}`;
  },

  _slug(s) {
    return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  },

  leLoadLessonData() {
    const sid = document.getElementById('leSubject')?.value || '';
    const cid = document.getElementById('leChapter')?.value || '';
    const lid = document.getElementById('leLesson')?.value || '';
    if (!sid || !cid || !lid) return;
    this._editCtx = { sid, cid, lid };

    const ov = this._getOverrides()[`${sid}::${cid}`] || {};
    const lp = (ov.lessonPatches || {})[lid] || {};

    const ed = document.getElementById('leEditor');
    if (ed) ed.style.display = 'block';

    const v = document.getElementById('leVideo');
    if (v) v.value = lp.videoId || '';

    const nt = document.getElementById('leNotesText');
    if (nt) nt.value = lp.notesText || '';
    const nu = document.getElementById('leNotesPdfUrl');
    if (nu) nu.value = lp.notesPdfUrl || '';

    const qt = document.getElementById('leQuizText');
    if (qt) qt.value = '';
    const pt = document.getElementById('lePyqText');
    if (pt) pt.value = lp.pyqText || '';
    const pu = document.getElementById('lePyqUrl');
    if (pu) pu.value = lp.pyqUrl || '';
    const papt = document.getElementById('lePaperText');
    if (papt) papt.value = lp.paperText || '';
    const pau = document.getElementById('lePaperUrl');
    if (pau) pau.value = lp.paperUrl || '';
  },

  lePreviewVideo() {
    const val = document.getElementById('leVideo')?.value || '';
    const vid = this.extractVideoId(val);
    if (!vid) { alert('Enter a valid YouTube URL/ID'); return; }
    window.open(`https://youtube.com/watch?v=${vid}`, '_blank');
  },

  leSaveVideo() {
    const { sid, cid, lid } = this._editCtx;
    const val = document.getElementById('leVideo')?.value || '';
    const vid = this.extractVideoId(val);
    if (!sid || !cid || !lid) { alert('Select a lesson first'); return; }
    if (!vid) { alert('Enter a valid YouTube URL/ID'); return; }
    this._setLessonPatch(sid, cid, lid, { videoId: vid });
    alert('✅ Lesson video saved');
  },

  leSaveNotes() {
    const { sid, cid, lid } = this._editCtx;
    if (!sid || !cid || !lid) { alert('Select a lesson first'); return; }
    const notesText = document.getElementById('leNotesText')?.value || '';
    const notesPdfUrl = document.getElementById('leNotesPdfUrl')?.value || '';
    this._setLessonPatch(sid, cid, lid, { notesText, notesPdfUrl });
    alert('✅ Notes saved');
  },

  _parseQuizLines(text) {
    return (text || '')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split('*').map(p => p.trim());
        if (parts.length < 6) return null;
        const q = parts[0];
        const options = parts.slice(1, 5);
        const ans = parseInt(parts[5], 10);
        if (!q || options.some(o => !o) || Number.isNaN(ans) || ans < 0 || ans > 3) return null;
        return { q, options, ans, difficulty: 'medium', createdAt: new Date().toISOString() };
      })
      .filter(Boolean);
  },

  leSaveQuiz() {
    const { sid, cid } = this._editCtx;
    if (!sid || !cid) { alert('Select a lesson first'); return; }
    const raw = document.getElementById('leQuizText')?.value || '';
    const items = this._parseQuizLines(raw);
    if (!items.length) { alert('No valid quiz lines found'); return; }
    // Chapter quiz is chapter-level in the app, so we store into overrides
    this._setOverride(sid, cid, { extraQuiz: items });
    alert('✅ Quiz saved to chapter');
  },

  leSavePyq() {
    const { sid, cid, lid } = this._editCtx;
    if (!sid || !cid || !lid) { alert('Select a lesson first'); return; }
    const pyqText = document.getElementById('lePyqText')?.value || '';
    const pyqUrl = document.getElementById('lePyqUrl')?.value || '';
    this._setLessonPatch(sid, cid, lid, { pyqText, pyqUrl });
    alert('✅ PYQs saved');
  },

  leSavePaper() {
    const { sid, cid, lid } = this._editCtx;
    if (!sid || !cid || !lid) { alert('Select a lesson first'); return; }
    const paperText = document.getElementById('lePaperText')?.value || '';
    const paperUrl = document.getElementById('lePaperUrl')?.value || '';
    this._setLessonPatch(sid, cid, lid, { paperText, paperUrl });
    alert('✅ Paper saved');
  },

  saveData() {
    localStorage.setItem('vm_admin_data', JSON.stringify(this.data));
    alert('Data saved successfully!');
  },

  exportData() {
    const dataStr = JSON.stringify(this.data, null, 2);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'class10edu_backup_' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
  },

  // Content Managers
  renderContentManager(panel, type, title, itemName) {
    const items = this.data[type === 'pdf' ? 'pdfs' : type + 's'] || [];
    const getSubjectName = (id) => {
      const subj = this.subjects.find(s => s.id === id);
      return subj ? subj.name : id;
    };
    const getChapterName = (id) => {
      const ch = this.chapters.find(c => c.id === id);
      return ch ? ch.title : id || 'All Chapters';
    };
    const formatDate = (dateString) => {
      if (!dateString) return '-';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };
    
    panel.innerHTML = `
      <div class="admin-header">
        <h1>${title}</h1>
        <button class="btn btn-primary btn-sm" onclick="Admin.switchSection('addContent')">➕ Add New</button>
      </div>
      
      <div class="content-table-wrapper">
        <table class="content-table">
          <thead>
            <tr>
              <th>${itemName}</th>
              <th>Subject</th>
              <th>Chapter</th>
              <th>Added</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, idx) => `
              <tr>
                <td>
                  <div class="item-info">
                    <span class="item-icon">${type === 'video' ? '🎬' : '📄'}</span>
                    <span class="item-name">${item.title || item.name}</span>
                  </div>
                </td>
                <td>${getSubjectName(item.subject)}</td>
                <td>${getChapterName(item.chapter)}</td>
                <td>${formatDate(item.createdAt)}</td>
                <td>
                  <div class="action-btns">
                    ${item.url || item.videoId ? `<button class="btn-icon" onclick="window.open('${item.url || `https://youtube.com/watch?v=${item.videoId}`}', '_blank')" title="Open">🔗</button>` : ''}
                    <button class="btn-icon delete" onclick="Admin.deleteItem('${type === 'pdf' ? 'pdfs' : type + 's'}', ${idx})" title="Delete">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${items.length === 0 ? `<div class="empty-state">No ${itemName.toLowerCase()}s added yet. <a href="#" onclick="Admin.switchSection('addContent')">Add your first one!</a></div>` : ''}
      </div>
    `;
  },

  renderNotesManager(panel) {
    const notes = this.data.notes || [];
    panel.innerHTML = `
      <div class="admin-header">
        <h1>Study Notes</h1>
        <button class="btn btn-primary btn-sm" onclick="Admin.switchSection('addContent')">➕ Add Notes</button>
      </div>
      <div class="notes-grid">
        ${notes.map((note, idx) => `
          <div class="note-card">
            <div class="note-header">
              <span class="note-subject">${this.getSubjectName(note.subject)}</span>
              <span class="note-date">${this.formatDate(note.createdAt)}</span>
            </div>
            <h4>${note.title}</h4>
            <p class="note-preview">${note.content?.substring(0, 100) || 'No content'}...</p>
            <div class="note-actions">
              <button class="btn btn-sm btn-gh" onclick="Admin.deleteItem('notes', ${idx})">Delete</button>
            </div>
          </div>
        `).join('')}
        ${notes.length === 0 ? '<div class="empty-state">No notes added yet.</div>' : ''}
      </div>
    `;
  },

  renderQuizManager(panel) {
    const quizzes = this.data.quiz || [];
    panel.innerHTML = `
      <div class="admin-header">
        <h1>Quiz Bank</h1>
        <button class="btn btn-primary btn-sm" onclick="Admin.switchSection('addContent')">➕ Add Question</button>
      </div>
      <div class="quiz-stats">
        <span class="stat-pill">Total: ${quizzes.length}</span>
        <span class="stat-pill easy">Easy: ${quizzes.filter(q => q.difficulty === 'easy').length}</span>
        <span class="stat-pill medium">Medium: ${quizzes.filter(q => q.difficulty === 'medium').length}</span>
        <span class="stat-pill hard">Hard: ${quizzes.filter(q => q.difficulty === 'hard').length}</span>
      </div>
      <div class="quiz-list">
        ${quizzes.map((q, idx) => `
          <div class="quiz-item ${q.difficulty}">
            <div class="quiz-main">
              <span class="difficulty-badge ${q.difficulty}">${q.difficulty}</span>
              <p class="quiz-question">${q.q}</p>
              <div class="quiz-meta">${this.getSubjectName(q.subject)} • ${this.getChapterName(q.chapter)}</div>
            </div>
            <div class="quiz-actions">
              <button class="btn btn-sm btn-gh" onclick="Admin.deleteItem('quiz', ${idx})">Delete</button>
            </div>
          </div>
        `).join('')}
        ${quizzes.length === 0 ? '<div class="empty-state">No quiz questions added yet.</div>' : ''}
      </div>
    `;
  },

  renderPYQManager(panel) {
    const pyqs = this.data.pyqs || [];
    panel.innerHTML = `
      <div class="admin-header">
        <h1>Previous Year Questions</h1>
        <button class="btn btn-primary btn-sm" onclick="Admin.switchSection('addContent')">➕ Add PYQ</button>
      </div>
      <div class="pyq-timeline">
        ${pyqs.map((pyq, idx) => `
          <div class="pyq-item">
            <div class="pyq-year">${pyq.year}</div>
            <div class="pyq-content">
              <div class="pyq-subject">${this.getSubjectName(pyq.subject)} • ${pyq.board?.toUpperCase() || 'CBSE'}</div>
              <p class="pyq-question">${pyq.question?.substring(0, 150)}...</p>
              <div class="pyq-actions">
                <button class="btn btn-sm btn-gh" onclick="Admin.deleteItem('pyqs', ${idx})">Delete</button>
              </div>
            </div>
          </div>
        `).join('')}
        ${pyqs.length === 0 ? '<div class="empty-state">No PYQs added yet.</div>' : ''}
      </div>
    `;
  },

  renderPaperManager(panel) {
    const papers = this.data.papers || [];
    panel.innerHTML = `
      <div class="admin-header">
        <h1>Question Papers</h1>
        <button class="btn btn-primary btn-sm" onclick="Admin.switchSection('addContent')">➕ Add Paper</button>
      </div>
      <div class="papers-list">
        ${papers.map((paper, idx) => `
          <div class="paper-card">
            <div class="paper-icon">📑</div>
            <div class="paper-info">
              <h4>${paper.title}</h4>
              <div class="paper-meta">
                <span>${this.getSubjectName(paper.subject)}</span>
                <span>${paper.year}</span>
                <span class="paper-type">${paper.type}</span>
              </div>
            </div>
            <div class="paper-actions">
              <a href="${paper.url}" target="_blank" class="btn btn-sm btn-primary">Open</a>
              <button class="btn btn-sm btn-gh" onclick="Admin.deleteItem('papers', ${idx})">Delete</button>
            </div>
          </div>
        `).join('')}
        ${papers.length === 0 ? '<div class="empty-state">No question papers added yet.</div>' : ''}
      </div>
    `;
  },

  renderTeacherManager(panel) {
    const teachers = this.data.teachers || [];
    panel.innerHTML = `
      <div class="admin-header">
        <h1>Teachers</h1>
        <button class="btn btn-primary btn-sm" onclick="Admin.showAddTeacherForm()">➕ Add Teacher</button>
      </div>
      <div class="teachers-grid-admin">
        ${teachers.map((t, idx) => `
          <div class="teacher-card-admin" style="border-left-color: ${t.color || '#6366F1'}">
            <div class="teacher-avatar-admin" style="background: ${t.color || '#6366F1'}">
              ${t.avatar || t.name?.[0] || 'T'}
            </div>
            <div class="teacher-info-admin">
              <h4>${t.name}</h4>
              <p>${t.channel || 'No channel'}</p>
            </div>
            <div class="teacher-actions">
              <button class="btn btn-sm btn-gh" onclick="Admin.deleteItem('teachers', ${idx})">Delete</button>
            </div>
          </div>
        `).join('')}
        ${teachers.length === 0 ? '<div class="empty-state">No teachers added yet.</div>' : ''}
      </div>
      
      <div id="teacherFormArea"></div>
    `;
  },

  showAddTeacherForm() {
    const formArea = document.getElementById('teacherFormArea');
    formArea.innerHTML = `
      <div class="form-card" style="margin-top: 24px;">
        <h3>👨‍🏫 Add New Teacher</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>Name *</label>
            <input type="text" class="fc" id="teacherName" placeholder="e.g., R.K. Sharma">
          </div>
          <div class="form-group">
            <label>Channel</label>
            <input type="text" class="fc" id="teacherChannel" placeholder="e.g., Physics Wallah">
          </div>
          <div class="form-group">
            <label>Avatar (initials)</label>
            <input type="text" class="fc" id="teacherAvatar" placeholder="e.g., RS" maxlength="2">
          </div>
          <div class="form-group">
            <label>Color</label>
            <input type="color" class="fc" id="teacherColor" value="#6366F1">
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" onclick="Admin.saveTeacher()">💾 Save Teacher</button>
          <button class="btn btn-gh" onclick="document.getElementById('teacherFormArea').innerHTML=''">Cancel</button>
        </div>
      </div>
    `;
  },

  saveTeacher() {
    const teacher = {
      name: document.getElementById('teacherName').value,
      channel: document.getElementById('teacherChannel').value,
      avatar: document.getElementById('teacherAvatar').value,
      color: document.getElementById('teacherColor').value
    };
    
    if (!teacher.name) { alert('Teacher name is required!'); return; }
    
    if (!this.data.teachers) this.data.teachers = [];
    this.data.teachers.push(teacher);
    this.saveData();
    alert('✅ Teacher added!');
    this.switchSection('teachers');
  },

  clearAllData() {
    if (confirm('⚠️ WARNING: This will delete ALL admin data! Are you sure?')) {
      localStorage.removeItem('vm_admin_data');
      this.data = {};
      alert('All data cleared. Page will refresh.');
      location.reload();
    }
  },

  // Helpers
  getSubjectName(id) {
    const subj = this.subjects.find(s => s.id === id);
    return subj ? subj.name : id;
  },

  getChapterName(id) {
    const ch = this.chapters.find(c => c.id === id);
    return ch ? ch.title : id || '-';
  },

  // Mobile Navigation - Slide-out drawer with backdrop
  toggleMobileNav() {
    const nav = document.getElementById('adminNav');
    const backdrop = document.getElementById('adminNavBackdrop');
    
    if (nav.classList.contains('open')) {
      this.closeMobileNav();
    } else {
      nav.classList.add('open');
      if (backdrop) backdrop.classList.add('on');
      document.body.style.overflow = 'hidden';
    }
  },

  closeMobileNav() {
    const nav = document.getElementById('adminNav');
    const backdrop = document.getElementById('adminNavBackdrop');
    
    if (nav) nav.classList.remove('open');
    if (backdrop) backdrop.classList.remove('on');
    document.body.style.overflow = '';
  },

  formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  },

  deleteItem(key, idx) {
    if (confirm('Are you sure you want to delete this item?')) {
      if (this.data[key]) {
        this.data[key].splice(idx, 1);
        this.saveData();
        // Refresh current section
        const sectionMap = {
          'videos': 'links', 'pdfs': 'pdfs', 'quiz': 'quiz',
          'pyqs': 'pyqs', 'papers': 'papers', 'notes': 'notes', 'teachers': 'teachers'
        };
        this.switchSection(sectionMap[key] || 'dashboard');
      }
    }
  },

  // PDF File Upload with Base64 encoding (for small files < 1MB)
  handlePdfFileUpload(inputId, callback) {
    const input = document.getElementById(inputId);
    if (!input || !input.files || !input.files[0]) return;
    
    const file = input.files[0];
    const maxSize = 1024 * 1024; // 1MB limit
    
    if (file.size > maxSize) {
      alert('File too large. Please use files under 1MB or paste a URL instead.');
      return;
    }
    
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file only.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      callback(base64, file.name);
    };
    reader.onerror = () => {
      alert('Error reading file. Please try again or use a URL.');
    };
    reader.readAsDataURL(file);
  },

  // Upload PDF for Notes
  uploadNotesPdf() {
    this.handlePdfFileUpload('leNotesFile', (base64, name) => {
      const { sid, cid, lid } = this._editCtx;
      if (!sid || !cid || !lid) { alert('Select a lesson first'); return; }
      
      this._setLessonPatch(sid, cid, lid, { 
        notesPdfBase64: base64,
        notesPdfName: name 
      });
      alert('✅ Notes PDF uploaded and saved');
    });
  },

  // Upload PDF for PYQ
  uploadPyqPdf() {
    this.handlePdfFileUpload('lePyqFile', (base64, name) => {
      const { sid, cid, lid } = this._editCtx;
      if (!sid || !cid || !lid) { alert('Select a lesson first'); return; }
      
      this._setLessonPatch(sid, cid, lid, { 
        pyqPdfBase64: base64,
        pyqPdfName: name 
      });
      alert('✅ PYQ PDF uploaded and saved');
    });
  },

  // Upload PDF for Question Paper
  uploadPaperPdf() {
    this.handlePdfFileUpload('lePaperFile', (base64, name) => {
      const { sid, cid, lid } = this._editCtx;
      if (!sid || !cid || !lid) { alert('Select a lesson first'); return; }
      
      this._setLessonPatch(sid, cid, lid, { 
        paperPdfBase64: base64,
        paperPdfName: name 
      });
      alert('✅ Question Paper PDF uploaded and saved');
    });
  },

  // Parse PDF to text (simplified - extracts text from base64 PDFs if possible)
  async parsePdfToText(base64Data) {
    // This is a placeholder - in a real implementation you'd use a PDF parsing library
    // For now, we just store the base64 data and display it as a downloadable link
    return null;
  },

  checkLogin() {
    const key = localStorage.getItem('vm_admin_key');
    if (key === '6610') {
      document.getElementById('loginWall').style.display = 'none';
      document.getElementById('adminBody').style.display = 'block';
      return true;
    }
    return false;
  },

  // ====================================
  // CORE CMS MANAGEMENT METHODS
  // ====================================

  // SUBJECT MANAGEMENT
  renderSubjectsManager(panel) {
    panel.innerHTML = `
      <div class="admin-header">
        <h1>📚 Subject Management</h1>
        <button class="btn btn-primary" onclick="Admin.showAddSubjectForm()">➕ Add Subject</button>
      </div>
      
      <div class="subjects-list">
        ${this.appData.subjects.map((subj, idx) => `
          <div class="subject-card">
            <div class="subject-icon">${subj.icon || '📚'}</div>
            <div class="subject-info">
              <h3>${subj.name}</h3>
              <p>${subj.chapters?.length || 0} chapters</p>
            </div>
            <div class="subject-actions">
              <button class="btn btn-sm btn-secondary" onclick="Admin.editSubject(${idx})">✏️ Edit</button>
              <button class="btn btn-sm btn-gh" onclick="Admin.deleteSubject(${idx})">🗑️ Delete</button>
            </div>
          </div>
        `).join('')}
        ${this.appData.subjects.length === 0 ? '<div class="empty-state">No subjects added yet.</div>' : ''}
      </div>
    `;
  },

  showAddSubjectForm() {
    const form = `
      <div class="form-card">
        <h3>Add New Subject</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>Subject Name *</label>
            <input type="text" class="fc" id="subjectName" placeholder="e.g., Mathematics">
          </div>
          <div class="form-group">
            <label>Icon *</label>
            <input type="text" class="fc" id="subjectIcon" placeholder="e.g., 📚">
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" onclick="Admin.saveSubject()">💾 Save Subject</button>
          <button class="btn btn-secondary" onclick="Admin.switchSection('subjects')">Cancel</button>
        </div>
      </div>
    `;
    document.getElementById('adminPanels').querySelector('.a-panel.on').innerHTML = form;
  },

  saveSubject() {
    const name = document.getElementById('subjectName')?.value?.trim();
    const icon = document.getElementById('subjectIcon')?.value?.trim() || '📚';
    
    if (!name) { alert('Subject name is required'); return; }
    
    const subject = {
      id: this._slug(name),
      name,
      icon,
      chapters: []
    };
    
    this.appData.subjects.push(subject);
    this.saveData();
    this.switchSection('subjects');
  },

  editSubject(idx) {
    const subj = this.appData.subjects[idx];
    const form = `
      <div class="form-card">
        <h3>Edit Subject</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>Subject Name *</label>
            <input type="text" class="fc" id="subjectName" value="${subj.name}">
          </div>
          <div class="form-group">
            <label>Icon *</label>
            <input type="text" class="fc" id="subjectIcon" value="${subj.icon}">
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" onclick="Admin.updateSubject(${idx})">💾 Update Subject</button>
          <button class="btn btn-secondary" onclick="Admin.switchSection('subjects')">Cancel</button>
        </div>
      </div>
    `;
    document.getElementById('adminPanels').querySelector('.a-panel.on').innerHTML = form;
  },

  updateSubject(idx) {
    const name = document.getElementById('subjectName')?.value?.trim();
    const icon = document.getElementById('subjectIcon')?.value?.trim() || '📚';
    
    if (!name) { alert('Subject name is required'); return; }
    
    this.appData.subjects[idx] = {
      ...this.appData.subjects[idx],
      name,
      icon
    };
    
    this.saveData();
    this.switchSection('subjects');
  },

  deleteSubject(idx) {
    if (!confirm('Are you sure you want to delete this subject and all its chapters?')) return;
    
    this.appData.subjects.splice(idx, 1);
    this.saveData();
    this.switchSection('subjects');
  },

  // TEACHER MANAGEMENT
  renderTeachersManager(panel) {
    panel.innerHTML = `
      <div class="admin-header">
        <h1>👨‍🏫 Teacher Management</h1>
        <button class="btn btn-primary" onclick="Admin.showAddTeacherForm()">➕ Add Teacher</button>
      </div>
      
      <div class="teachers-list">
        ${this.appData.teachers.map((teacher, idx) => `
          <div class="teacher-card">
            <div class="teacher-avatar">${teacher.name?.[0]?.toUpperCase() || 'T'}</div>
            <div class="teacher-info">
              <h3>${teacher.name}</h3>
              <p>${teacher.subject || 'Not assigned'}</p>
              <p class="teacher-channel">${teacher.youtubeChannel || 'No channel'}</p>
            </div>
            <div class="teacher-actions">
              <button class="btn btn-sm btn-secondary" onclick="Admin.editTeacher(${idx})">✏️ Edit</button>
              <button class="btn btn-sm btn-gh" onclick="Admin.deleteTeacher(${idx})">🗑️ Delete</button>
            </div>
          </div>
        `).join('')}
        ${this.appData.teachers.length === 0 ? '<div class="empty-state">No teachers added yet.</div>' : ''}
      </div>
    `;
  },

  showAddTeacherForm() {
    const form = `
      <div class="form-card">
        <h3>Add New Teacher</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>Teacher Name *</label>
            <input type="text" class="fc" id="teacherName" placeholder="e.g., John Doe">
          </div>
          <div class="form-group">
            <label>Subject *</label>
            <select class="fc" id="teacherSubject">
              <option value="">Select Subject</option>
              ${this.appData.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group full-width">
            <label>YouTube Channel</label>
            <input type="text" class="fc" id="teacherChannel" placeholder="e.g., @teachermath">
          </div>
          <div class="form-group full-width">
            <label>Profile Image URL</label>
            <input type="text" class="fc" id="teacherImage" placeholder="https://...">
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" onclick="Admin.saveTeacher()">💾 Save Teacher</button>
          <button class="btn btn-secondary" onclick="Admin.switchSection('teachers')">Cancel</button>
        </div>
      </div>
    `;
    document.getElementById('adminPanels').querySelector('.a-panel.on').innerHTML = form;
  },

  saveTeacher() {
    const name = document.getElementById('teacherName')?.value?.trim();
    const subject = document.getElementById('teacherSubject')?.value;
    const channel = document.getElementById('teacherChannel')?.value?.trim();
    const image = document.getElementById('teacherImage')?.value?.trim();
    
    if (!name || !subject) { alert('Name and subject are required'); return; }
    
    const teacher = {
      id: 'teacher_' + Date.now(),
      name,
      subject,
      youtubeChannel: channel,
      profileImage: image
    };
    
    this.appData.teachers.push(teacher);
    this.saveData();
    this.switchSection('teachers');
  },

  editTeacher(idx) {
    const teacher = this.appData.teachers[idx];
    const form = `
      <div class="form-card">
        <h3>Edit Teacher</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>Teacher Name *</label>
            <input type="text" class="fc" id="teacherName" value="${teacher.name}">
          </div>
          <div class="form-group">
            <label>Subject *</label>
            <select class="fc" id="teacherSubject">
              <option value="">Select Subject</option>
              ${this.appData.subjects.map(s => `<option value="${s.id}" ${s.id === teacher.subject ? 'selected' : ''}>${s.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group full-width">
            <label>YouTube Channel</label>
            <input type="text" class="fc" id="teacherChannel" value="${teacher.youtubeChannel || ''}">
          </div>
          <div class="form-group full-width">
            <label>Profile Image URL</label>
            <input type="text" class="fc" id="teacherImage" value="${teacher.profileImage || ''}">
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" onclick="Admin.updateTeacher(${idx})">💾 Update Teacher</button>
          <button class="btn btn-secondary" onclick="Admin.switchSection('teachers')">Cancel</button>
        </div>
      </div>
    `;
    document.getElementById('adminPanels').querySelector('.a-panel.on').innerHTML = form;
  },

  updateTeacher(idx) {
    const name = document.getElementById('teacherName')?.value?.trim();
    const subject = document.getElementById('teacherSubject')?.value;
    const channel = document.getElementById('teacherChannel')?.value?.trim();
    const image = document.getElementById('teacherImage')?.value?.trim();
    
    if (!name || !subject) { alert('Name and subject are required'); return; }
    
    this.appData.teachers[idx] = {
      ...this.appData.teachers[idx],
      name,
      subject,
      youtubeChannel: channel,
      profileImage: image
    };
    
    this.saveData();
    this.switchSection('teachers');
  },

  deleteTeacher(idx) {
    if (!confirm('Are you sure you want to delete this teacher?')) return;
    
    this.appData.teachers.splice(idx, 1);
    this.saveData();
    this.switchSection('teachers');
  },

  // CONTENT MANAGEMENT
  renderContentManager(panel) {
    panel.innerHTML = `
      <div class="admin-header">
        <h1>📝 Content Management</h1>
        <p class="subtitle">Add content to specific lessons</p>
      </div>
      
      <div class="form-card">
        <h3>Select Target Lesson</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>Subject *</label>
            <select class="fc" id="contentSubject" onchange="Admin.loadContentChapters()">
              <option value="">Select Subject</option>
              ${this.appData.subjects.map(s => `<option value="${s.id}">${s.icon} ${s.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Chapter *</label>
            <select class="fc" id="contentChapter" onchange="Admin.loadContentLessons()">
              <option value="">Select Chapter</option>
            </select>
          </div>
          <div class="form-group">
            <label>Lesson *</label>
            <select class="fc" id="contentLesson" onchange="Admin.loadContentData()">
              <option value="">Select Lesson</option>
            </select>
          </div>
        </div>
      </div>
      
      <div id="contentEditor" style="display:none">
        <div class="form-card">
          <h3>🎬 Add Video</h3>
          <div class="form-grid">
            <div class="form-group full-width">
              <label>Video Title *</label>
              <input type="text" class="fc" id="videoTitle" placeholder="e.g., Introduction to Algebra">
            </div>
            <div class="form-group full-width">
              <label>YouTube URL/ID *</label>
              <input type="text" class="fc" id="videoUrl" placeholder="https://youtube.com/watch?v=... or dQw4w9WgXcQ">
            </div>
            <div class="form-group">
              <label>Teacher *</label>
              <select class="fc" id="videoTeacher">
                <option value="">Select Teacher</option>
                ${this.appData.teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" onclick="Admin.addVideoContent()">➕ Add Video</button>
          </div>
        </div>
        
        <div class="form-card">
          <h3>📝 Add Notes</h3>
          <div class="form-grid">
            <div class="form-group full-width">
              <label>Notes Title *</label>
              <input type="text" class="fc" id="notesTitle" placeholder="e.g., Chapter 1 Summary">
            </div>
            <div class="form-group full-width">
              <label>Notes Type *</label>
              <select class="fc" id="notesType" onchange="Admin.toggleNotesInput()">
                <option value="text">Text Notes</option>
                <option value="pdf">PDF Upload</option>
                <option value="drive">Google Drive PDF</option>
              </select>
            </div>
            <div class="form-group full-width" id="notesTextGroup">
              <label>Notes Content *</label>
              <textarea class="fc" id="notesContent" rows="8" placeholder="Write your notes here..."></textarea>
            </div>
            <div class="form-group full-width" id="notesPdfGroup" style="display:none">
              <label>Upload PDF File *</label>
              <input type="file" class="fc" id="notesPdfFile" accept=".pdf" onchange="Admin.handlePdfUpload('notes')">
              <div id="notesPdfPreview" class="pdf-preview"></div>
            </div>
            <div class="form-group full-width" id="notesDriveGroup" style="display:none">
              <label>Google Drive PDF Link *</label>
              <input type="text" class="fc" id="notesDriveUrl" placeholder="https://drive.google.com/file/d/.../view">
              <button type="button" class="btn btn-secondary" onclick="Admin.previewDrivePdf('notes')">👁️ Preview</button>
            </div>
            <div class="form-group">
              <label>Teacher *</label>
              <select class="fc" id="notesTeacher">
                <option value="">Select Teacher</option>
                ${this.appData.teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" onclick="Admin.addNotesContent()">➕ Add Notes</button>
          </div>
        </div>
        
        <div class="form-card">
          <h3>🧩 Add Quiz</h3>
          <div class="form-grid">
            <div class="form-group full-width">
              <label>Quiz Type *</label>
              <select class="fc" id="quizType" onchange="Admin.toggleQuizInput()">
                <option value="text">Text Quiz</option>
                <option value="pdf">PDF Upload</option>
                <option value="drive">Google Drive PDF</option>
              </select>
            </div>
            <div class="form-group full-width" id="quizTextGroup">
              <label>Quiz Questions (Format: Question*Option1*Option2*Option3*Option4*Answer)</label>
              <textarea class="fc" id="quizContent" rows="8" placeholder="What is 2+2?*1*2*3*4*2
What is 3+3?*5*6*7*8*6"></textarea>
            </div>
            <div class="form-group full-width" id="quizPdfGroup" style="display:none">
              <label>Upload Quiz PDF *</label>
              <input type="file" class="fc" id="quizPdfFile" accept=".pdf" onchange="Admin.handlePdfUpload('quiz')">
              <div id="quizPdfPreview" class="pdf-preview"></div>
            </div>
            <div class="form-group full-width" id="quizDriveGroup" style="display:none">
              <label>Google Drive Quiz PDF *</label>
              <input type="text" class="fc" id="quizDriveUrl" placeholder="https://drive.google.com/file/d/.../view">
              <button type="button" class="btn btn-secondary" onclick="Admin.previewDrivePdf('quiz')">👁️ Preview</button>
            </div>
            <div class="form-group">
              <label>Teacher *</label>
              <select class="fc" id="quizTeacher">
                <option value="">Select Teacher</option>
                ${this.appData.teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" onclick="Admin.addQuizContent()">➕ Add Quiz</button>
          </div>
        </div>
        
        <div id="existingContent">
          <!-- Existing content will be shown here -->
        </div>
      </div>
    `;
  },

  loadContentChapters() {
    const sid = document.getElementById('contentSubject')?.value;
    const chSel = document.getElementById('contentChapter');
    const subj = this.appData.subjects.find(s => s.id === sid);
    
    if (!subj?.chapters?.length) {
      chSel.innerHTML = '<option value="">Select Chapter</option>';
      return;
    }
    
    chSel.innerHTML = `<option value="">Select Chapter</option>${
      subj.chapters.map(ch => `<option value="${ch.id}">${ch.title}</option>`).join('')
    }`;
  },

  loadContentLessons() {
    const sid = document.getElementById('contentSubject')?.value;
    const cid = document.getElementById('contentChapter')?.value;
    const subj = this.appData.subjects.find(s => s.id === sid);
    const ch = subj?.chapters?.find(c => c.id === cid);
    const lsSel = document.getElementById('contentLesson');
    
    if (!ch?.lessons?.length) {
      lsSel.innerHTML = '<option value="">Select Lesson</option>';
      return;
    }
    
    lsSel.innerHTML = `<option value="">Select Lesson</option>${
      ch.lessons.map(l => `<option value="${l.id}">${l.title}</option>`).join('')
    }`;
  },

  loadContentData() {
    const sid = document.getElementById('contentSubject')?.value;
    const cid = document.getElementById('contentChapter')?.value;
    const lid = document.getElementById('contentLesson')?.value;
    
    if (!sid || !cid || !lid) return;
    
    this._editCtx = { sid, cid, lid };
    document.getElementById('contentEditor').style.display = 'block';
    
    // Load existing content
    const lessonId = `${sid}::${cid}::${lid}`;
    const content = this.appData.content[lessonId] || { videos: [], notes: [], quiz: [] };
    
    const existingHtml = `
      <div class="existing-content">
        <h3>📋 Existing Content</h3>
        
        <div class="content-section">
          <h4>🎬 Videos (${content.videos.length})</h4>
          ${content.videos.map((v, i) => `
            <div class="content-item">
              <span>${v.title} - ${this.getTeacherName(v.teacherId)}</span>
              <button class="btn btn-sm btn-gh" onclick="Admin.deleteContent('videos', ${i})">Delete</button>
            </div>
          `).join('') || '<p>No videos added</p>'}
        </div>
        
        <div class="content-section">
          <h4>📝 Notes (${content.notes.length})</h4>
          ${content.notes.map((n, i) => `
            <div class="content-item">
              <span>${n.title} - ${this.getTeacherName(n.teacherId)}</span>
              <button class="btn btn-sm btn-gh" onclick="Admin.deleteContent('notes', ${i})">Delete</button>
            </div>
          `).join('') || '<p>No notes added</p>'}
        </div>
      </div>
    `;
    
    document.getElementById('existingContent').innerHTML = existingHtml;
  },

  addVideoContent() {
    const { sid, cid, lid } = this._editCtx;
    const title = document.getElementById('videoTitle')?.value?.trim();
    const url = document.getElementById('videoUrl')?.value?.trim();
    const teacherId = document.getElementById('videoTeacher')?.value;
    
    if (!title || !url || !teacherId) {
      alert('All video fields are required');
      return;
    }
    
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      alert('Invalid YouTube URL');
      return;
    }
    
    const lessonId = `${sid}::${cid}::${lid}`;
    if (!this.appData.content[lessonId]) {
      this.appData.content[lessonId] = { videos: [], notes: [], quiz: [] };
    }
    
    this.appData.content[lessonId].videos.push({
      id: 'video_' + Date.now(),
      title,
      youtubeId: videoId,
      teacherId,
      createdAt: new Date().toISOString()
    });
    
    this.saveData();
    alert('✅ Video added successfully');
    
    // Clear form
    document.getElementById('videoTitle').value = '';
    document.getElementById('videoUrl').value = '';
    document.getElementById('videoTeacher').value = '';
    
    // Refresh content display
    this.loadContentData();
  },

  addNotesContent() {
    const { sid, cid, lid } = this._editCtx;
    const title = document.getElementById('notesTitle')?.value?.trim();
    const content = document.getElementById('notesContent')?.value?.trim();
    const teacherId = document.getElementById('notesTeacher')?.value;
    
    if (!title || !content || !teacherId) {
      alert('All notes fields are required');
      return;
    }
    
    const lessonId = `${sid}::${cid}::${lid}`;
    if (!this.appData.content[lessonId]) {
      this.appData.content[lessonId] = { videos: [], notes: [], quiz: [] };
    }
    
    this.appData.content[lessonId].notes.push({
      id: 'notes_' + Date.now(),
      title,
      text: content,
      teacherId,
      createdAt: new Date().toISOString()
    });
    
    this.saveData();
    alert('✅ Notes added successfully');
    
    // Clear form
    document.getElementById('notesTitle').value = '';
    document.getElementById('notesContent').value = '';
    document.getElementById('notesTeacher').value = '';
    
    // Refresh content display
    this.loadContentData();
  },

  deleteContent(type, index) {
    if (!confirm('Are you sure you want to delete this content?')) return;
    
    const { sid, cid, lid } = this._editCtx;
    const lessonId = `${sid}::${cid}::${lid}`;
    
    if (this.appData.content[lessonId]) {
      this.appData.content[lessonId][type].splice(index, 1);
      this.saveData();
      this.loadContentData();
    }
  },

  getTeacherName(teacherId) {
    const teacher = this.appData.teachers.find(t => t.id === teacherId);
    return teacher ? teacher.name : 'Unknown';
  },

  // ====================================
  // PDF & REAL-TIME SYNC METHODS
  // ====================================

  // Toggle input types based on selection
  toggleNotesInput() {
    const type = document.getElementById('notesType')?.value;
    document.getElementById('notesTextGroup').style.display = type === 'text' ? 'block' : 'none';
    document.getElementById('notesPdfGroup').style.display = type === 'pdf' ? 'block' : 'none';
    document.getElementById('notesDriveGroup').style.display = type === 'drive' ? 'block' : 'none';
  },

  toggleQuizInput() {
    const type = document.getElementById('quizType')?.value;
    document.getElementById('quizTextGroup').style.display = type === 'text' ? 'block' : 'none';
    document.getElementById('quizPdfGroup').style.display = type === 'pdf' ? 'block' : 'none';
    document.getElementById('quizDriveGroup').style.display = type === 'drive' ? 'block' : 'none';
  },

  // Handle PDF file upload
  async handlePdfUpload(type) {
    const fileInput = document.getElementById(`${type}PdfFile`);
    const previewDiv = document.getElementById(`${type}PdfPreview`);
    const file = fileInput.files[0];
    
    if (!file) return;
    
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('PDF file must be less than 5MB');
      fileInput.value = '';
      return;
    }
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      alert('Please select a PDF file');
      fileInput.value = '';
      return;
    }
    
    // Convert to base64
    const base64 = await this.fileToBase64(file);
    
    // Store in temporary storage
    this._tempPdfData = this._tempPdfData || {};
    this._tempPdfData[type] = {
      name: file.name,
      size: file.size,
      base64: base64
    };
    
    // Show preview
    previewDiv.innerHTML = `
      <div class="pdf-info">
        <p>📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)</p>
        <p class="pdf-success">✅ PDF ready for upload</p>
      </div>
    `;
  },

  // Convert file to base64
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  },

  // Preview Google Drive PDF
  previewDrivePdf(type) {
    const url = document.getElementById(`${type}DriveUrl`)?.value?.trim();
    if (!url) {
      alert('Please enter a Google Drive URL');
      return;
    }
    
    // Convert to direct download link
    const driveId = this.extractDriveId(url);
    if (!driveId) {
      alert('Invalid Google Drive URL');
      return;
    }
    
    const directUrl = `https://drive.google.com/uc?export=view&id=${driveId}`;
    
    // Show preview
    const previewDiv = document.getElementById(`${type}PdfPreview`);
    previewDiv.innerHTML = `
      <div class="pdf-info">
        <p>🔗 Google Drive PDF</p>
        <a href="${directUrl}" target="_blank" class="btn btn-secondary">👁️ Preview PDF</a>
      </div>
    `;
  },

  // Extract Google Drive ID from URL
  extractDriveId(url) {
    const match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  },

  // Enhanced addNotesContent with PDF support
  addNotesContent() {
    const { sid, cid, lid } = this._editCtx;
    const title = document.getElementById('notesTitle')?.value?.trim();
    const type = document.getElementById('notesType')?.value;
    const teacherId = document.getElementById('notesTeacher')?.value;
    
    if (!title || !teacherId) {
      alert('Title and teacher are required');
      return;
    }
    
    let notesData = {
      id: 'notes_' + Date.now(),
      title,
      teacherId,
      createdAt: new Date().toISOString()
    };
    
    // Handle different input types
    if (type === 'text') {
      const content = document.getElementById('notesContent')?.value?.trim();
      if (!content) {
        alert('Notes content is required');
        return;
      }
      notesData.text = content;
      notesData.type = 'text';
    } else if (type === 'pdf') {
      if (!this._tempPdfData?.notes) {
        alert('Please upload a PDF file');
        return;
      }
      notesData.pdf = {
        name: this._tempPdfData.notes.name,
        base64: this._tempPdfData.notes.base64,
        size: this._tempPdfData.notes.size
      };
      notesData.type = 'pdf';
    } else if (type === 'drive') {
      const driveUrl = document.getElementById('notesDriveUrl')?.value?.trim();
      const driveId = this.extractDriveId(driveUrl);
      if (!driveId) {
        alert('Invalid Google Drive URL');
        return;
      }
      notesData.driveUrl = driveUrl;
      notesData.driveId = driveId;
      notesData.type = 'drive';
    }
    
    const lessonId = `${sid}::${cid}::${lid}`;
    if (!this.appData.content[lessonId]) {
      this.appData.content[lessonId] = { videos: [], notes: [], quiz: [] };
    }
    
    this.appData.content[lessonId].notes.push(notesData);
    this.saveData();
    this.broadcastUpdate('notes', notesData);
    
    alert('✅ Notes added successfully');
    this.clearNotesForm();
    this.loadContentData();
  },

  // Enhanced addQuizContent with PDF support
  addQuizContent() {
    const { sid, cid, lid } = this._editCtx;
    const type = document.getElementById('quizType')?.value;
    const teacherId = document.getElementById('quizTeacher')?.value;
    
    if (!teacherId) {
      alert('Teacher is required');
      return;
    }
    
    let quizData = {
      id: 'quiz_' + Date.now(),
      title: `Quiz - ${new Date().toLocaleDateString()}`,
      teacherId,
      createdAt: new Date().toISOString()
    };
    
    // Handle different input types
    if (type === 'text') {
      const content = document.getElementById('quizContent')?.value?.trim();
      if (!content) {
        alert('Quiz content is required');
        return;
      }
      quizData.questions = this.parseQuizText(content);
      quizData.type = 'text';
    } else if (type === 'pdf') {
      if (!this._tempPdfData?.quiz) {
        alert('Please upload a PDF file');
        return;
      }
      quizData.pdf = {
        name: this._tempPdfData.quiz.name,
        base64: this._tempPdfData.quiz.base64,
        size: this._tempPdfData.quiz.size
      };
      quizData.type = 'pdf';
    } else if (type === 'drive') {
      const driveUrl = document.getElementById('quizDriveUrl')?.value?.trim();
      const driveId = this.extractDriveId(driveUrl);
      if (!driveId) {
        alert('Invalid Google Drive URL');
        return;
      }
      quizData.driveUrl = driveUrl;
      quizData.driveId = driveId;
      quizData.type = 'drive';
    }
    
    const lessonId = `${sid}::${cid}::${lid}`;
    if (!this.appData.content[lessonId]) {
      this.appData.content[lessonId] = { videos: [], notes: [], quiz: [] };
    }
    
    this.appData.content[lessonId].quiz.push(quizData);
    this.saveData();
    this.broadcastUpdate('quiz', quizData);
    
    alert('✅ Quiz added successfully');
    this.clearQuizForm();
    this.loadContentData();
  },

  // Parse quiz text into structured format
  parseQuizText(text) {
    const lines = text.trim().split('\n');
    const questions = [];
    
    lines.forEach(line => {
      const parts = line.split('*');
      if (parts.length >= 6) {
        questions.push({
          question: parts[0].trim(),
          options: [parts[1].trim(), parts[2].trim(), parts[3].trim(), parts[4].trim()],
          correctAnswer: parseInt(parts[5].trim()) - 1 // Convert to 0-indexed
        });
      }
    });
    
    return questions;
  },

  // Clear forms
  clearNotesForm() {
    document.getElementById('notesTitle').value = '';
    document.getElementById('notesContent').value = '';
    document.getElementById('notesTeacher').value = '';
    document.getElementById('notesPdfFile').value = '';
    document.getElementById('notesDriveUrl').value = '';
    document.getElementById('notesPdfPreview').innerHTML = '';
    delete this._tempPdfData?.notes;
  },

  clearQuizForm() {
    document.getElementById('quizContent').value = '';
    document.getElementById('quizTeacher').value = '';
    document.getElementById('quizPdfFile').value = '';
    document.getElementById('quizDriveUrl').value = '';
    document.getElementById('quizPdfPreview').innerHTML = '';
    delete this._tempPdfData?.quiz;
  },

  // REAL-TIME SYNC: Broadcast updates to all devices
  broadcastUpdate(type, data) {
    // Store update in localStorage for other tabs
    const updates = JSON.parse(localStorage.getItem('vm_live_updates') || '[]');
    updates.push({
      type,
      data,
      timestamp: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    });
    
    // Keep only last 50 updates
    if (updates.length > 50) {
      updates.splice(0, updates.length - 50);
    }
    
    localStorage.setItem('vm_live_updates', JSON.stringify(updates));
    
    // Trigger storage event for other tabs
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'vm_live_updates',
      newValue: JSON.stringify(updates)
    }));
  },

  // Listen for real-time updates
  initRealTimeSync() {
    // Listen for storage events from other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === 'vm_live_updates' && e.newValue) {
        const updates = JSON.parse(e.newValue);
        const latestUpdate = updates[updates.length - 1];
        if (latestUpdate) {
          this.handleRealTimeUpdate(latestUpdate);
        }
      }
    });
    
    // Check for pending updates on load
    const updates = JSON.parse(localStorage.getItem('vm_live_updates') || '[]');
    if (updates.length > 0) {
      const latestUpdate = updates[updates.length - 1];
      this.handleRealTimeUpdate(latestUpdate);
    }
  },

  // Handle real-time updates
  handleRealTimeUpdate(update) {
    console.log('🔄 Real-time update received:', update.type);
    
    // Show notification
    this.showUpdateNotification(`New ${update.type} added by admin`);
    
    // Refresh data if on relevant page
    if (window.location.pathname.includes('admin.html')) {
      this.loadData().then(() => {
        // Refresh current section if needed
        if (this.activeSection === 'content') {
          this.loadContentData();
        }
      });
    }
  },

  // Show update notification
  showUpdateNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">🔄</span>
        <span class="notification-text">${message}</span>
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 3000);
  },
};