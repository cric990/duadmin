const AdminState = {
    activeTab: 'dashboard',
    editingCourseId: null,
    activeChatUid: null,
    courses: [],
    users: [],
    settings: {
        welcomeSound: true,
        showNames: true
    }
};

const UI = {
    navLinks: document.querySelectorAll('.nav-link'),
    tabPanes: document.querySelectorAll('.admin-tab-content'),
    viewTitle: document.getElementById('admin-current-view-title'),

    statUsers: document.getElementById('admin-stat-users'),
    statCourses: document.getElementById('admin-stat-courses'),
    statChats: document.getElementById('admin-stat-chats'),
    recentUserTable: document.getElementById('admin-recent-users-table'),

    courseFormTitle: document.getElementById('course-form-mode-title'),
    inpCourseTitle: document.getElementById('admin-course-title'),
    inpCourseThumb: document.getElementById('admin-course-thumb'),
    inpCourseUrl: document.getElementById('admin-course-url'),
    btnSaveCourse: document.getElementById('admin-save-course-btn'),
    btnCancelEdit: document.getElementById('admin-cancel-edit-btn'),
    courseTableBody: document.getElementById('admin-courses-table-body'),

    fullUserTable: document.getElementById('admin-full-users-table'),

    chatUserSidebar: document.getElementById('admin-chat-user-list'),
    chatActiveName: document.getElementById('admin-active-chat-name'),
    chatStatus: document.getElementById('admin-chat-status'),
    chatMessages: document.getElementById('admin-chat-messages'),
    chatInput: document.getElementById('admin-chat-input'),
    btnSendChat: document.getElementById('admin-chat-send-btn'),

    inpPosterImg: document.getElementById('admin-poster-img'),
    inpPosterLink: document.getElementById('admin-poster-link'),
    btnSavePoster: document.getElementById('admin-save-poster-btn'),
    btnRemovePoster: document.getElementById('admin-remove-poster-btn'),

    inpNotifTitle: document.getElementById('admin-notif-title'),
    inpNotifMsg: document.getElementById('admin-notif-msg'),
    inpNotifImg: document.getElementById('admin-notif-img'),
    btnSendNotif: document.getElementById('admin-send-notif-btn'),

    setWelcomeSound: document.getElementById('admin-set-welcome-sound'),
    setShowNames: document.getElementById('admin-set-show-names'),
    btnSaveSettings: document.getElementById('admin-save-settings-btn')
};

const AdminApp = {
    init: function() {
        this.setupNavigation();
        this.startFirebaseListeners();
        this.bindActionListeners();
        this.applyRippleEngine();
    },

    setupNavigation: function() {
        UI.navLinks.forEach(link => {
            link.addEventListener('click', () => {
                const target = link.getAttribute('data-tab');
                this.switchTab(target);
            });
        });
    },

    switchTab: function(tabId) {
        AdminState.activeTab = tabId;
        UI.navLinks.forEach(l => l.classList.remove('active'));
        const activeLink = document.querySelector(`.nav-link[data-tab="${tabId}"]`);
        if (activeLink) activeLink.classList.add('active');

        UI.tabPanes.forEach(pane => pane.classList.remove('active'));
        const targetPane = document.getElementById(`tab-${tabId}`);
        if (targetPane) targetPane.classList.add('active');

        UI.viewTitle.innerText = tabId.charAt(0).toUpperCase() + tabId.slice(1) + ' Control Center';

        if (tabId === 'chat' && AdminState.activeChatUid) {
            this.loadConversation(AdminState.activeChatUid);
        }
    },

    startFirebaseListeners: function() {
        db.collection('XamIQ_Courses').orderBy('createdAt', 'desc').onSnapshot(snap => {
            const list = [];
            snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
            AdminState.courses = list;
            UI.statCourses.innerText = list.length;
            this.renderCourseInventory();
        });

        db.collection('XamIQ_Users').orderBy('joinedAt', 'desc').onSnapshot(snap => {
            const list = [];
            snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
            AdminState.users = list;
            UI.statUsers.innerText = list.length;
            this.renderUserMatrix();
        });

        db.collection('XamIQ_Chats').orderBy('timestamp', 'desc').onSnapshot(snap => {
            const groups = new Map();
            let pending = 0;

            snap.forEach(doc => {
                const data = doc.data();
                if (!groups.has(data.userId)) {
                    groups.set(data.userId, {
                        uid: data.userId,
                        name: data.userName,
                        lastText: data.text,
                        time: data.timestamp,
                        role: data.role
                    });
                    if (data.role === 'user') pending++;
                }
            });

            UI.statChats.innerText = pending;
            this.renderSupportSidebar(Array.from(groups.values()));
        });

        db.collection('XamIQ_Settings').doc('global').onSnapshot(doc => {
            if (doc.exists) {
                const s = doc.data();
                AdminState.settings = s;
                UI.setWelcomeSound.checked = s.welcomeSound;
                UI.setShowNames.checked = s.showNames;
            }
        });

        db.collection('XamIQ_Posters').doc('current').onSnapshot(doc => {
            if (doc.exists) {
                UI.inpPosterImg.value = doc.data().image || '';
                UI.inpPosterLink.value = doc.data().link || '';
            }
        });
    },

    renderCourseInventory: function() {
        UI.courseTableBody.innerHTML = '';
        AdminState.courses.forEach(course => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${course.thumb}" class="admin-thumb-box" onerror="this.src='https://via.placeholder.com/70x40'"></td>
                <td>
                    <div style="font-weight:700;">${course.title}</div>
                    <div style="font-size:0.65rem;color:#a0aec0;">REF: ${course.id}</div>
                </td>
                <td><span class="status-badge ${course.enabled ? 'status-enabled' : 'status-disabled'}">${course.enabled ? 'ACTIVE' : 'DISABLED'}</span></td>
                <td>
                    <div style="display:flex; gap:8px;">
                        <button class="btn-table-action" onclick="AdminApp.prepareEditCourse('${course.id}')">
                            <svg viewBox="0 0 24 24" width="16"><path fill="currentColor" d="M20.71,7.04L19.17,8.58L15.42,4.83L16.96,3.29C17.35,2.9 17.98,2.9 18.37,3.29L20.71,5.63C21.1,6.02 21.1,6.65 20.71,7.04M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" /></svg>
                        </button>
                        <button class="btn-table-action" onclick="AdminApp.toggleCourseVis('${course.id}', ${course.enabled})">
                            <svg viewBox="0 0 24 24" width="16"><path fill="currentColor" d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" /></svg>
                        </button>
                        <button class="btn-table-action" style="background:#fff5f5; color:#e53e3e;" onclick="AdminApp.eraseCourse('${course.id}')">
                            <svg viewBox="0 0 24 24" width="16"><path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19V4M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" /></svg>
                        </button>
                    </div>
                </td>
            `;
            UI.courseTableBody.appendChild(tr);
        });
    },

    renderUserMatrix: function() {
        UI.recentUserTable.innerHTML = '';
        UI.fullUserTable.innerHTML = '';

        AdminState.users.forEach((user, index) => {
            const joined = user.joinedAt ? user.joinedAt.toDate().toLocaleDateString() : 'N/A';
            const rowHtml = `
                <td style="font-weight:700;">${AdminState.settings.showNames ? (user.name || 'Anonymous') : 'STUDENT_HIDDEN'}</td>
                <td style="font-family:monospace; font-size:0.75rem; color:#718096;">${user.id}</td>
                <td style="font-size:0.8rem;">${user.platform || 'System Browser'}</td>
                <td>
                    <button class="btn-table-action" style="color:#e53e3e; width:auto; padding:0 12px; font-size:0.75rem; font-weight:700;" onclick="AdminApp.banishUser('${user.id}')">BAN ACCOUNT</button>
                </td>
            `;

            const fullTr = document.createElement('tr');
            fullTr.innerHTML = rowHtml;
            UI.fullUserTable.appendChild(fullTr);

            if (index < 8) {
                const recTr = document.createElement('tr');
                recTr.innerHTML = `
                    <td style="font-weight:700;">${user.name || 'Student'}</td>
                    <td>${joined}</td>
                    <td><div style="max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:0.75rem; color:#718096;">${user.platform || 'Unknown'}</div></td>
                    <td><span class="status-badge status-enabled">VERIFIED</span></td>
                `;
                UI.recentUserTable.appendChild(recTr);
            }
        });
    },

    renderSupportSidebar: function(chats) {
        UI.chatUserSidebar.innerHTML = '';
        chats.forEach(chat => {
            const div = document.createElement('div');
            div.className = `user-tab ${AdminState.activeChatUid === chat.uid ? 'active' : ''}`;
            div.innerHTML = `
                <div class="user-tab-name">${chat.name || 'Anonymous Learner'}</div>
                <div class="user-tab-last-msg">${chat.lastText}</div>
            `;
            div.onclick = () => this.loadConversation(chat.uid, chat.name);
            UI.chatUserSidebar.appendChild(div);
        });
    },

    loadConversation: function(uid, name) {
        AdminState.activeChatUid = uid;
        UI.chatActiveName.innerText = name || 'Learner Chat';
        UI.chatStatus.innerText = 'Connected';
        UI.chatStatus.className = 'status-badge status-enabled';

        const tabs = document.querySelectorAll('.user-tab');
        tabs.forEach(t => t.classList.remove('active'));
        
        db.collection('XamIQ_Chats')
            .where('userId', '==', uid)
            .orderBy('timestamp', 'asc')
            .onSnapshot(snap => {
                if (AdminState.activeChatUid !== uid) return;
                UI.chatMessages.innerHTML = '';
                snap.forEach(doc => {
                    const msg = doc.data();
                    const isAdmin = msg.role === 'admin';
                    const div = document.createElement('div');
                    div.style.cssText = `
                        max-width: 82%;
                        padding: 14px 18px;
                        border-radius: 20px;
                        font-size: 0.9rem;
                        line-height: 1.5;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.02);
                        ${isAdmin ? 'align-self: flex-end; background: #ff8c00; color: #fff; border-bottom-right-radius: 2px;' : 'align-self: flex-start; background: #fff; color: #1a202c; border-bottom-left-radius: 2px; border: 1px solid #edf2f7;'}
                    `;
                    div.innerText = msg.text;
                    UI.chatMessages.appendChild(div);
                });
                UI.chatMessages.scrollTop = UI.chatMessages.scrollHeight;
            });
    },

    bindActionListeners: function() {
        UI.btnSaveCourse.addEventListener('click', () => this.processCourseData());
        UI.btnCancelEdit.addEventListener('click', () => this.resetFormState());

        UI.btnSendChat.addEventListener('click', () => this.dispatchAdminReply());
        UI.chatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') this.dispatchAdminReply(); });

        UI.btnSavePoster.addEventListener('click', () => {
            const img = UI.inpPosterImg.value.trim();
            const url = UI.inpPosterLink.value.trim();
            if(!img) return alert("System requires a valid Poster URL");
            db.collection('XamIQ_Posters').doc('current').set({
                image: img, link: url, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => alert("Startup Poster Synchronization Complete"));
        });

        UI.btnRemovePoster.addEventListener('click', () => {
            db.collection('XamIQ_Posters').doc('current').delete().then(() => {
                UI.inpPosterImg.value = '';
                UI.inpPosterLink.value = '';
                alert("Poster Decommissioned");
            });
        });

        UI.btnSaveSettings.addEventListener('click', () => {
            db.collection('XamIQ_Settings').doc('global').set({
                welcomeSound: UI.setWelcomeSound.checked,
                showNames: UI.setShowNames.checked
            }).then(() => alert("Global System Architecture Parameters Updated"));
        });

        UI.btnSendNotif.addEventListener('click', () => {
            const title = UI.inpNotifTitle.value.trim();
            const msg = UI.inpNotifMsg.value.trim();
            if(!title || !msg) return alert("Broadcast failed: Empty payload detected");
            db.collection('XamIQ_Notifications').add({
                title, message: msg, image: UI.inpNotifImg.value, timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                alert("Broadcast Dispatched to Cluster");
                UI.inpNotifTitle.value = '';
                UI.inpNotifMsg.value = '';
                UI.inpNotifImg.value = '';
            });
        });
    },

    processCourseData: function() {
        const payload = {
            title: UI.inpCourseTitle.value.trim(),
            thumb: UI.inpCourseThumb.value.trim(),
            url: UI.inpCourseUrl.value.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!payload.title || !payload.thumb || !payload.url) return alert("Validation error: Required parameters missing");

        if (AdminState.editingCourseId) {
            db.collection('XamIQ_Courses').doc(AdminState.editingCourseId).update(payload)
                .then(() => {
                    alert("Object Modification Successful");
                    this.resetFormState();
                });
        } else {
            payload.enabled = true;
            payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            db.collection('XamIQ_Courses').add(payload)
                .then(() => {
                    alert("Course Injection Successful");
                    this.resetFormState();
                });
        }
    },

    prepareEditCourse: function(id) {
        const item = AdminState.courses.find(x => x.id === id);
        if (!item) return;

        AdminState.editingCourseId = id;
        UI.inpCourseTitle.value = item.title;
        UI.inpCourseThumb.value = item.thumb;
        UI.inpCourseUrl.value = item.url;

        UI.courseFormTitle.innerText = "UPDATING: " + item.title.toUpperCase();
        UI.btnSaveCourse.innerText = "APPLY MODIFICATIONS";
        UI.btnSaveCourse.style.background = "#38a169";
        UI.btnCancelEdit.classList.remove('hidden');

        this.switchTab('courses');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    resetFormState: function() {
        AdminState.editingCourseId = null;
        UI.inpCourseTitle.value = '';
        UI.inpCourseThumb.value = '';
        UI.inpCourseUrl.value = '';
        UI.courseFormTitle.innerText = "CREATE NEW COURSE OBJECT";
        UI.btnSaveCourse.innerText = "SAVE COURSE";
        UI.btnSaveCourse.style.background = "var(--admin-accent)";
        UI.btnCancelEdit.classList.add('hidden');
    },

    toggleCourseVis: function(id, current) {
        db.collection('XamIQ_Courses').doc(id).update({ enabled: !current });
    },

    eraseCourse: function(id) {
        if (confirm("CRITICAL ACTION: Purge this course object from cluster?")) {
            db.collection('XamIQ_Courses').doc(id).delete();
        }
    },

    banishUser: function(id) {
        if (confirm("CRITICAL ACTION: Rescind access for this UID permanently?")) {
            db.collection('XamIQ_Users').doc(id).delete();
        }
    },

    dispatchAdminReply: function() {
        const val = UI.chatInput.value.trim();
        if (!val || !AdminState.activeChatUid) return;

        db.collection('XamIQ_Chats').add({
            userId: AdminState.activeChatUid,
            userName: "System Admin",
            text: val,
            role: 'admin',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        UI.chatInput.value = '';
    },

    applyRippleEngine: function() {
        document.addEventListener('click', (e) => {
            const target = e.target.closest('.nav-link, .admin-btn-primary, .btn-table-action');
            if (target) {
                const circle = document.createElement('span');
                const diameter = Math.max(target.clientWidth, target.clientHeight);
                circle.style.width = circle.style.height = `${diameter}px`;
                circle.style.left = `${e.clientX - target.offsetLeft - diameter / 2}px`;
                circle.style.top = `${e.clientY - target.offsetTop - diameter / 2}px`;
                circle.classList.add('admin-ripple-fx');
                
                target.style.position = 'relative';
                target.style.overflow = 'hidden';
                target.appendChild(circle);
                setTimeout(() => circle.remove(), 600);
            }
        });
        
        const style = document.createElement('style');
        style.innerHTML = `.admin-ripple-fx { position: absolute; border-radius: 50%; background: rgba(0,0,0,0.08); transform: scale(0); animation: rpl 0.6s linear; pointer-events: none; } @keyframes rpl { to { transform: scale(4); opacity: 0; } }`;
        document.head.appendChild(style);
    }
};

window.onload = () => AdminApp.init();