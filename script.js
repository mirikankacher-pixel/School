// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBrbZv_aZj2C2Ve66flr4HXQeSc_u9YHDQ",
  authDomain: "bsef-e852e.firebaseapp.com",
  databaseURL: "https://bsef-e852e-default-rtdb.firebaseio.com",
  projectId: "bsef-e852e",
  storageBucket: "bsef-e852e.firebasestorage.app",
  messagingSenderId: "394357917241",
  appId: "1:394357917241:web:fcc2a2672a144895a5efe8",
  measurementId: "G-NJ5GM99X4Z"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const dbRef = database.ref('school_data');

let db = {};
let currentUser = null;
let currentActiveView = 'schedule';
let modalType = '';

// Real-time Listener
dbRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        db = data;
        const proIdx = db.users.findIndex(u => u.name === "Mehdi Amouhiy");
        if(proIdx !== -1) db.users[proIdx].role = "pro-admin";

        if (currentUser) {
            currentUser = db.users.find(u => u.code === currentUser.code) || currentUser;
            app.render(currentActiveView);
        }
    }
});

const app = {
    save: () => dbRef.set(db),

    login: () => {
        const code = document.getElementById('auth-code').value;
        const userIndex = db.users.findIndex(u => u.code === code);
        
        if (userIndex !== -1) {
            currentUser = db.users[userIndex];
            db.users[userIndex].lastLogin = new Date().toLocaleString();
            app.save();
            
            document.getElementById('login-screen').classList.remove('active');
            document.getElementById('main-app').classList.add('active');
            document.getElementById('user-name').innerText = currentUser.name.split(' ')[0];
            
            const panel = document.getElementById('admin-panel');
            if (currentUser.role === 'pro-admin') {
                panel.className = "admin-bar glass pro-admin";
                panel.innerHTML = `<span><i class="fas fa-crown"></i> Pro Admin Mode</span>`;
                panel.classList.remove('hidden');
            } else if (currentUser.role === 'admin') {
                panel.className = "admin-bar glass";
                panel.innerHTML = `<span><i class="fas fa-user-shield"></i> Admin Mode</span>`;
                panel.classList.remove('hidden');
            } else {
                panel.classList.add('hidden');
            }
            
            app.navigate('schedule');
            setInterval(app.updateTimers, 1000);
        } else {
            document.getElementById('login-error').style.display = 'block';
        }
    },

    // Fixed Logout Logic
    logout: () => {
        currentUser = null;
        document.getElementById('auth-code').value = '';
        document.getElementById('main-app').classList.remove('active');
        document.getElementById('dropdown').classList.remove('active');
        document.getElementById('login-screen').classList.add('active');
    },

    navigate: (view) => {
        currentActiveView = view;
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        document.getElementById(`view-${view}`).classList.remove('hidden');
        document.getElementById('dropdown').classList.remove('active');
        app.render(view);
    },

    triggerUpdate: (tab) => {
        if (!db.updates) db.updates = {};
        db.updates[tab] = Date.now();
        app.save();
    },

    addExam: () => app.openModal('exams'),
    addHomework: () => app.openModal('homework'),
    addAbsence: () => app.openModal('teachers'),

    deleteItem: (view, index) => {
        if (confirm("Are you sure you want to delete this item?")) {
            db[view].splice(index, 1);
            app.triggerUpdate(view);
        }
    },

    editStudentName: (index) => {
        const newName = prompt("Enter new name for this student:", db.users[index].name);
        if (newName) {
            db.users[index].name = newName;
            app.save();
        }
    },

    editStudentCode: (index) => {
        const newCode = prompt("Enter new access code (password) for this student:", db.users[index].code);
        if (newCode) {
            db.users[index].code = newCode;
            app.save();
        }
    },

    promote: (index) => {
        if (confirm(`Promote ${db.users[index].name} to Admin?`)) {
            db.users[index].role = 'admin';
            app.save();
        }
    },

    deleteStudent: (index) => {
        if (confirm(`Are you sure you want to remove ${db.users[index].name} from the system?`)) {
            db.users.splice(index, 1);
            app.save();
        }
    },

    render: (view) => {
        const isPro = currentUser.role === 'pro-admin';
        const isAdmin = isPro || currentUser.role === 'admin';
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin ? 'block' : 'none');

        if (view === 'schedule') {
            const body = document.getElementById('schedule-body');
            body.innerHTML = `<tr><th>Session</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th></tr>`;
            if (db.schedule) {
                db.schedule.forEach((row, rIdx) => {
                    let tr = `<tr><td style="font-weight:700; color:#adb5bd;">${row[0]}</td>`;
                    for(let cIdx=1; cIdx<=6; cIdx++) {
                        const cellVal = row[cIdx] || "-";
                        tr += `<td ${isAdmin ? `onclick="app.editCell(${rIdx},${cIdx})"` : ''}>${cellVal}</td>`;
                    }
                    body.innerHTML += tr + `</tr>`;
                });
            }
        } 
        else if (view === 'students' && isAdmin) {
            const body = document.getElementById('student-list-body');
            body.innerHTML = '';
            db.users.forEach((u, i) => {
                const isSelf = u.code === currentUser.code;
                let canView = isPro || (isAdmin && u.role === 'student') || isSelf;
                let codeDisplay = canView ? u.code : '••••••••';
                
                body.innerHTML += `<tr>
                    <td onclick="${canView ? `app.editStudentName(${i})`:''}" class="${canView ? 'admin-editable-cell' : ''}">${u.name} ${u.role==='pro-admin'?'<span class="badge-pro">PRO</span>':u.role==='admin'?'<span class="badge-admin">ADMIN</span>':''}</td>
                    <td onclick="${canView ? `app.editStudentCode(${i})`:''}" class="${canView ? 'admin-editable-cell' : ''}">${codeDisplay}</td>
                    <td>${u.role}</td>
                    <td>${u.lastLogin || 'Never'}</td>
                    <td>${(isPro && !isSelf) ? `<button class="btn-action btn-promote" onclick="app.promote(${i})">Promote</button> <button class="btn-action btn-delete" onclick="app.deleteStudent(${i})">Del</button>` : '--'}</td>
                </tr>`;
            });
        }
        else if (view === 'exams' || view === 'homework') {
            const container = document.getElementById(`${view}-container`);
            container.innerHTML = '';
            (db[view] || []).forEach((item, i) => {
                container.innerHTML += `
                <div class="card glass state-${item.state || ''}" onclick="this.classList.toggle('expanded')">
                    ${isAdmin ? `<button class="delete-btn" onclick="event.stopPropagation(); app.deleteItem('${view}',${i})"><i class="fas fa-trash"></i></button>` : ''}
                    <h4>${item.subject}</h4>
                    <p><i class="far fa-calendar-alt"></i> ${item.date}</p>
                    <p>${item.desc}</p>
                    <div class="timeline-container"><div class="timeline-bar" id="bar-${view}-${i}"></div></div>
                    <span class="timer-text" id="timer-${view}-${i}"></span>
                </div>`;
            });
        }
        else if (view === 'teachers') {
            const container = document.getElementById('teachers-container');
            container.innerHTML = '';
            (db.teachers || []).forEach((item, i) => {
                container.innerHTML += `
                <div class="card glass">
                    ${isAdmin ? `<button class="delete-btn" onclick="app.deleteItem('teachers',${i})"><i class="fas fa-trash"></i></button>` : ''}
                    <h4>${item.name}</h4>
                    <p>Absent: <strong style="color:var(--accent-red)">${item.dates}</strong></p>
                </div>`;
            });
        }
    },

    openModal: (type) => {
        modalType = type;
        document.getElementById('action-modal').classList.add('active');
        document.getElementById('group-subject').classList.toggle('hidden', type === 'teachers');
        document.getElementById('group-teacher').classList.toggle('hidden', type !== 'teachers');
        document.getElementById('group-date').classList.toggle('hidden', type === 'teachers');
        document.getElementById('group-state').classList.toggle('hidden', type !== 'exams');
        document.getElementById('group-dates-absence').classList.toggle('hidden', type !== 'teachers');
    },

    submitModal: () => {
        if (modalType === 'teachers') {
            const name = document.getElementById('input-teacher').value;
            // Get checked days
            const checkedBoxes = Array.from(document.querySelectorAll('.day-cb:checked')).map(cb => cb.value);
            const customDate = document.getElementById('input-absence-custom').value;
            
            let finalDates = checkedBoxes.join(', ');
            if (customDate) {
                finalDates += finalDates ? ` (and ${customDate})` : customDate;
            }
            if (!finalDates) finalDates = "Unspecified Date";

            if (!db.teachers) db.teachers = [];
            db.teachers.push({ name, dates: finalDates });
        } else {
            const newItem = {
                subject: document.getElementById('input-subject').value,
                date: document.getElementById('input-date').value,
                desc: document.getElementById('input-desc').value,
                state: document.getElementById('input-state').value
            };
            if (!db[modalType]) db[modalType] = [];
            db[modalType].push(newItem);
        }
        app.triggerUpdate(modalType);
        app.closeModal();
    },

    closeModal: () => {
        document.getElementById('action-modal').classList.remove('active');
        document.getElementById('input-teacher').value = '';
        document.getElementById('input-absence-custom').value = '';
        document.getElementById('input-subject').value = '';
        document.getElementById('input-date').value = '';
        document.getElementById('input-desc').value = '';
        document.querySelectorAll('.day-cb').forEach(cb => cb.checked = false);
    },

    updateTimers: () => {
        ['exams', 'homework'].forEach(view => {
            (db[view] || []).forEach((item, i) => {
                const bar = document.getElementById(`bar-${view}-${i}`);
                const text = document.getElementById(`timer-${view}-${i}`);
                if (!bar || !text) return;
                
                const diff = new Date(item.date).getTime() - new Date().getTime();
                if (diff < 0) { text.innerText = "Overdue"; bar.style.width = "0%"; bar.style.backgroundColor = "#555"; return; }
                
                const hrs = Math.floor(diff / 3600000);
                const mins = Math.floor((diff % 3600000) / 60000);
                text.innerText = `${hrs}h ${mins}m remaining`;
                
                bar.style.width = Math.min(100, (hrs / 168) * 100) + "%";
                bar.style.backgroundColor = hrs > 48 ? "#2ecc71" : hrs > 24 ? "#f1c40f" : "#e74c3c";
            });
        });
    },

    toggleMenu: () => document.getElementById('dropdown').classList.toggle('active'),
    editCell: (r, c) => {
        const val = prompt("Enter value:", db.schedule[r][c]);
        if(val !== null) { db.schedule[r][c] = val; app.triggerUpdate('schedule'); }
    }
};