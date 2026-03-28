const defaultDB = {
    users: [
        { name: "Mehdi Amouhiy", code: "password", role: "admin", lastLogin: "Never" },
        { name: "Ahmed Ennagi", code: "Porsche turbo s", role: "student", lastLogin: "Never" }
    ],
    schedule: [
        ["8:30-9:30", "", "", "", "", "", ""],
        ["9:30-10:30", "", "", "", "", "", ""],
        ["10:30-11:30", "", "", "", "", "", ""],
        ["11:30-12:30", "", "", "", "", "", ""],
        ["14:30-15:30", "", "", "", "", "", ""],
        ["15:30-16:30", "", "", "", "", "", ""],
        ["16:30-17:30", "", "", "", "", "", ""],
        ["17:30-18:30", "", "", "", "", "", ""]
    ],
    exams: [], homework: [], teachers: [],
    updates: { schedule: 0, exams: 0, homework: 0, teachers: 0 }
};

// Your official Firebase Configuration
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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const dbRef = database.ref('school_data');

let db = defaultDB;
let currentUser = null;
let currentActiveView = 'schedule';

// Listen for Real-Time Changes
dbRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        db = data;
        if (currentUser) {
            app.render(currentActiveView);
            app.checkNotifications();
        }
    } else {
        // Initial setup if database is empty
        dbRef.set(defaultDB);
    }
});

const app = {
    save: () => dbRef.set(db),

    login: () => {
        const input = document.getElementById('auth-code');
        const code = input.value;
        const userIndex = db.users.findIndex(u => u.code === code);
        
        if (userIndex !== -1) {
            currentUser = db.users[userIndex];
            db.users[userIndex].lastLogin = new Date().toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
            app.save();
            
            document.getElementById('login-screen').classList.remove('active');
            document.getElementById('main-app').classList.add('active');
            document.getElementById('user-name').innerText = currentUser.name.split(' ')[0];
            
            if (currentUser.role === 'admin') {
                document.getElementById('admin-panel').classList.remove('hidden');
                document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
            } else {
                document.getElementById('admin-panel').classList.add('hidden');
                document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
            }
            
            app.checkNotifications();
            app.navigate('schedule');
            input.value = '';
        } else {
            document.getElementById('login-error').style.display = 'block';
        }
    },

    logout: () => {
        currentUser = null;
        document.getElementById('main-app').classList.remove('active');
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('dropdown').classList.remove('active');
        document.getElementById('auth-code').value = '';
    },

    toggleMenu: () => document.getElementById('dropdown').classList.toggle('active'),

    navigate: (view) => {
        currentActiveView = view;
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        const target = document.getElementById(`view-${view}`);
        if(target) target.classList.remove('hidden');
        document.getElementById('dropdown').classList.remove('active');
        app.render(view);
        app.clearNotify(view);
    },

    render: (view) => {
        const isAdmin = currentUser && currentUser.role === 'admin';
        
        if (view === 'schedule') {
            const body = document.getElementById('schedule-body');
            body.innerHTML = `<tr><th>Session</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th></tr>`;
            db.schedule.forEach((row, rIdx) => {
                let tr = `<tr><td style="font-weight:700; color:#adb5bd; background:rgba(0,0,0,0.2)">${row[0]}</td>`;
                for(let cIdx=1; cIdx<=6; cIdx++) {
                    const cellVal = row[cIdx] || "-";
                    const editAttr = isAdmin ? `class="admin-editable-cell" onclick="app.editCell(${rIdx},${cIdx})"` : '';
                    tr += `<td ${editAttr}>${cellVal}</td>`;
                }
                body.innerHTML += tr + `</tr>`;
            });
        } 
        else if (view === 'students' && isAdmin) {
            const body = document.getElementById('student-list-body');
            body.innerHTML = '';
            db.users.forEach((u, i) => {
                const isSelf = u.code === currentUser.code;
                const actions = isSelf ? '--' : `
                    ${u.role !== 'admin' ? `<button class="btn-action btn-promote" onclick="app.promote(${i})">Promote</button>` : ''}
                    <button class="btn-action btn-delete" onclick="app.delStudent(${i})">Del</button>`;
                
                body.innerHTML += `<tr>
                    <td style="text-align:left; font-weight:600">${u.name} ${u.role==='admin'?'<span class="badge-admin">ADMIN</span>':''}</td>
                    <td style="font-family:monospace; color:#f39c12">${u.code}</td>
                    <td>${u.role}</td>
                    <td style="font-size:0.7rem">${u.lastLogin}</td>
                    <td>${actions}</td>
                </tr>`;
            });
        }
        else if (['exams', 'homework', 'teachers'].includes(view)) {
            const container = document.getElementById(`${view}-container`);
            container.innerHTML = db[view].length ? '' : `<div class="empty-state" style="text-align:center; padding:50px; color:#666; font-style:italic">Everything is chill. Nothing here yet.</div>`;
            db[view].forEach((item, index) => {
                const delIcon = isAdmin ? `<button class="delete-btn" onclick="app.delItem('${view}',${index})"><i class="fas fa-trash"></i></button>` : '';
                container.innerHTML += `<div class="card glass ${item.status === 'Confirmed Exam' ? 'status-confirmed' : ''}">
                    ${delIcon}<h4>${item.subject || item.name}</h4><p>${item.lessons || item.description || ''}</p>
                    <div style="margin-top:10px;"><span class="btn-outline" style="border-color:rgba(255,255,255,0.1)">${item.status || item.deadline || item.duration}</span></div>
                </div>`;
            });
        }
    },

    editCell: (r, c) => {
        const val = prompt("Enter Subject:", db.schedule[r][c]);
        if (val !== null) { db.schedule[r][c] = val; db.updates.schedule = Date.now(); app.save(); }
    },
    delItem: (cat, i) => { if(confirm("Delete this entry?")) { db[cat].splice(i,1); app.save(); } },
    promote: (i) => { if(confirm(`Make ${db.users[i].name} an Admin?`)) { db.users[i].role = 'admin'; app.save(); }},
    delStudent: (i) => { if(confirm("Permanently remove this student?")) { db.users.splice(i,1); app.save(); }},
    
    addStudent: () => {
        const name = prompt("Student Full Name:");
        if(!name) return;
        const code = Math.random().toString(36).substring(2,8).toUpperCase();
        db.users.push({name, code, role:'student', lastLogin:'Never'});
        app.save();
        alert(`Created: ${name}\nCode: ${code}`);
    },

    addExam: () => {
        const s = prompt("Subject:"); if(!s) return;
        const l = prompt("Lessons:");
        const st = prompt("Status: 1 for Possible, 2 for Confirmed") == '2' ? "Confirmed Exam" : "Possible Exam";
        db.exams.push({subject:s, lessons:l, status:st}); db.updates.exams = Date.now(); app.save();
    },

    addHomework: () => {
        const s = prompt("Subject:"); if(!s) return;
        const d = prompt("Homework Details:");
        const dl = prompt("Deadline:");
        db.homework.push({subject:s, description:d, deadline:dl}); db.updates.homework = Date.now(); app.save();
    },

    addAbsence: () => {
        const n = prompt("Teacher Name:"); if(!n) return;
        const d = prompt("Absent for how long?");
        db.teachers.push({name:n, duration:d}); db.updates.teachers = Date.now(); app.save();
    },

    checkNotifications: () => {
        const last = localStorage.getItem('last_viewed') || 0;
        let show = false;
        ['schedule','exams','homework','teachers'].forEach(t => {
            if(db.updates[t] > last) { 
                const dot = document.getElementById(`dot-${t}`);
                if(dot) dot.style.display = 'inline-block';
                show = true; 
            }
        });
        if(show) document.getElementById('global-notify').style.display = 'inline-block';
    },
    clearNotify: (view) => {
        const dot = document.getElementById(`dot-${view}`);
        if(dot) dot.style.display = 'none';
        localStorage.setItem('last_viewed', Date.now());
        const remaining = Array.from(document.querySelectorAll('.menu-item .notify-dot')).some(d => d.style.display === 'inline-block');
        if(!remaining) document.getElementById('global-notify').style.display = 'none';
    }
};

document.getElementById('auth-code').addEventListener('keypress', e => { if(e.key==='Enter') app.login(); });
                                                                                
