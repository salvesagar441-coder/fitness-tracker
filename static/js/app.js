let cachedWorkouts = [];
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();

    // Mobile sidebar toggle
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== toggleBtn) {
                sidebar.classList.remove('open');
            }
        });
    }
});

async function checkAuthStatus() {
    try {
        const res = await fetch('/api/me');
        if (res.ok) {
            const user = await res.json();
            currentUser = user;
            showApp(user);
        } else {
            showAuthScreen();
        }
    } catch (e) {
        showAuthScreen();
    }
}

function showApp(user) {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    document.getElementById('user-display-name').textContent = user.username;
    
    setupNavigation();
    setupWorkoutFilters();
    loadDashboard();
}

function showAuthScreen() {
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'flex';
}

function toggleAuthForm(formName) {
    if (formName === 'signup') {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('signup-form').classList.remove('hidden');
    } else {
        document.getElementById('signup-form').classList.add('hidden');
        document.getElementById('login-form').classList.remove('hidden');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const u = document.getElementById('login-username').value;
    const p = document.getElementById('login-password').value;
    
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username: u, password: p})
        });
        const data = await res.json();
        
        if (res.ok) {
            currentUser = data.user;
            showApp(data.user);
        } else {
            document.getElementById('login-error').textContent = data.error || 'Login failed';
        }
    } catch (err) {
        document.getElementById('login-error').textContent = 'Network error';
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const u = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const p = document.getElementById('signup-password').value;
    
    try {
        const res = await fetch('/api/signup', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username: u, email: email, password: p})
        });
        const data = await res.json();
        
        if (res.ok) {
            currentUser = data.user;
            showApp(data.user);
        } else {
            document.getElementById('signup-error').textContent = data.error || data.message || 'Signup failed';
        }
    } catch (err) {
        document.getElementById('signup-error').textContent = 'Network error';
    }
}

async function handleLogout() {
    await fetch('/api/logout', {method: 'POST'});
    currentUser = null;
    showAuthScreen();
}

function setupNavigation() {
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            const target = link.getAttribute('data-tab');
            document.getElementById(target + '-tab').classList.add('active');
            
            // Close mobile sidebar
            document.querySelector('.sidebar').classList.remove('open');
            
            // Load appropriate data
            if (target === 'dashboard') loadDashboard();
            if (target === 'workouts') loadWorkouts();
            if (target === 'nutrition') loadNutrition();
            if (target === 'analytics') loadAnalytics();
            if (target === 'goals') loadGoalsAndBadges();
            if (target === 'profile') loadProfile();
        });
    });
}

function setupWorkoutFilters() {
    const btns = document.querySelectorAll('.filter-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.getAttribute('data-filter');
            
            if (filter === 'All') {
                renderWorkouts(cachedWorkouts);
            } else {
                renderWorkouts(cachedWorkouts.filter(w => w.category === filter));
            }
        });
    });
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--primary-emerald)"></i> <span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function openModal(id) {
    document.getElementById(id).classList.add('open');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

// DASHBOARD
async function loadDashboard() {
    try {
        const res = await fetch('/api/stats');
        if (!res.ok) return;
        const data = await res.json();
        const t = data.today;
        
        document.getElementById('metric-calories-burned').textContent = t.calories_burned;
        document.getElementById('metric-calorie-goal').textContent = t.calorie_goal;
        document.getElementById('metric-workout-mins').textContent = t.workout_minutes;
        document.getElementById('metric-workout-goal').textContent = t.workout_goal_min;
        document.getElementById('metric-water-ml').textContent = t.water_ml;
        document.getElementById('metric-water-goal').textContent = t.water_goal_ml;
        document.getElementById('metric-bmi').textContent = t.bmi;
        document.getElementById('metric-bmi-category').textContent = t.bmi_category;
        
        if (typeof updateWeeklyChart === 'function') {
            updateWeeklyChart(data.weekly_chart.labels, data.weekly_chart.burned, data.weekly_chart.intake);
        }
        if (typeof updateMacroDonut === 'function') {
            updateMacroDonut(t.protein_g, t.carbs_g, t.fat_g);
        }
        
        loadRecentActivityList();
    } catch (e) {
        console.error(e);
    }
}

async function loadRecentActivityList() {
    try {
        const [wRes, nRes] = await Promise.all([
            fetch('/api/workouts'),
            fetch('/api/nutrition')
        ]);
        const wData = await wRes.json();
        const nData = await nRes.json();
        
        let logs = [];
        wData.forEach(w => logs.push({...w, type: 'workout'}));
        nData.forEach(n => logs.push({...n, type: 'meal'}));
        
        logs.sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
        logs = logs.slice(0, 5);
        
        const container = document.getElementById('dashboard-recent-logs');
        container.innerHTML = '';
        
        logs.forEach(log => {
            const isWorkout = log.type === 'workout';
            container.innerHTML += `
                <div class="log-item">
                    <div class="log-info">
                        <div class="log-badge ${isWorkout ? 'workout-badge' : 'meal-badge'}">
                            <i class="fa-solid ${isWorkout ? 'fa-dumbbell' : 'fa-utensils'}"></i>
                        </div>
                        <div>
                            <div class="log-title">${isWorkout ? log.title : log.meal_name}</div>
                            <div class="log-sub">${log.logged_at} &bull; ${isWorkout ? log.category : log.meal_type}</div>
                        </div>
                    </div>
                    <div class="log-val ${isWorkout ? 'negative' : 'positive'}">
                        ${isWorkout ? '-' + log.calories_burned : '+' + log.calories} kcal
                    </div>
                </div>
            `;
        });
    } catch (e) {}
}

async function quickAddWater(amount) {
    try {
        const res = await fetch('/api/water', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({amount_ml: amount})
        });
        if (res.ok) {
            showToast(`Added ${amount}ml water`);
            loadDashboard();
        }
    } catch (e) {}
}

// WORKOUTS
async function loadWorkouts() {
    try {
        const res = await fetch('/api/workouts');
        cachedWorkouts = await res.json();
        
        const activeFilter = document.querySelector('.filter-btn.active').getAttribute('data-filter');
        if (activeFilter === 'All') renderWorkouts(cachedWorkouts);
        else renderWorkouts(cachedWorkouts.filter(w => w.category === activeFilter));
    } catch (e) {}
}

function renderWorkouts(workouts) {
    const grid = document.getElementById('workouts-grid');
    grid.innerHTML = '';
    workouts.forEach(w => {
        grid.innerHTML += `
            <div class="workout-card glass-card">
                <div class="workout-card-head">
                    <span class="workout-category">${w.category}</span>
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-sm btn-outline" onclick="openEditWorkout(${w.id})"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="deleteWorkout(${w.id})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <div class="workout-title">${w.title}</div>
                <div style="font-size:0.8rem; color:var(--text-muted);">${w.logged_at}</div>
                ${w.notes ? `<div style="font-size:0.9rem; margin:8px 0;">${w.notes}</div>` : ''}
                <div class="workout-stats-row">
                    <div><span>${w.duration_minutes}</span> mins</div>
                    <div><span>${w.calories_burned}</span> kcal</div>
                    <div><span>${w.intensity}</span> intensity</div>
                </div>
            </div>
        `;
    });
}

async function submitWorkout(e) {
    e.preventDefault();
    const id = document.getElementById('w-edit-id').value;
    const body = {
        title: document.getElementById('w-title').value,
        category: document.getElementById('w-category').value,
        intensity: document.getElementById('w-intensity').value,
        duration_minutes: parseInt(document.getElementById('w-duration').value),
        calories_burned: parseInt(document.getElementById('w-calories').value),
        notes: document.getElementById('w-notes').value
    };
    
    try {
        let res;
        if (id) {
            res = await fetch(`/api/workouts/${id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(body)
            });
        } else {
            res = await fetch('/api/workouts', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(body)
            });
        }
        if (res.ok) {
            closeModal('workout-modal');
            document.getElementById('workout-form').reset();
            document.getElementById('w-edit-id').value = '';
            showToast('Workout saved');
            loadWorkouts();
            loadDashboard(); // update metrics
        }
    } catch (err) {}
}

function openEditWorkout(id) {
    const w = cachedWorkouts.find(x => x.id === id);
    if (!w) return;
    document.getElementById('w-edit-id').value = w.id;
    document.getElementById('w-title').value = w.title;
    document.getElementById('w-category').value = w.category;
    document.getElementById('w-intensity').value = w.intensity;
    document.getElementById('w-duration').value = w.duration_minutes;
    document.getElementById('w-calories').value = w.calories_burned;
    document.getElementById('w-notes').value = w.notes || '';
    document.getElementById('workout-modal-title').textContent = 'Edit Workout Session';
    openModal('workout-modal');
}

async function deleteWorkout(id) {
    if (!confirm('Delete this workout?')) return;
    try {
        const res = await fetch(`/api/workouts/${id}`, {method: 'DELETE'});
        if (res.ok) {
            showToast('Workout deleted');
            loadWorkouts();
            loadDashboard();
        }
    } catch (e) {}
}

// NUTRITION
let cachedMeals = [];
async function loadNutrition() {
    try {
        const res = await fetch('/api/nutrition');
        cachedMeals = await res.json();
        renderNutrition(cachedMeals);
    } catch (e) {}
}

function renderNutrition(meals) {
    let tp = 0, tc = 0, tf = 0;
    const list = document.getElementById('nutrition-list');
    list.innerHTML = '';
    
    meals.forEach(m => {
        tp += m.protein_g; tc += m.carbs_g; tf += m.fat_g;
        list.innerHTML += `
            <div class="log-item" style="margin-bottom:12px;">
                <div class="log-info">
                    <div class="log-badge meal-badge"><i class="fa-solid fa-utensils"></i></div>
                    <div>
                        <div class="log-title">${m.meal_name}</div>
                        <div class="log-sub">${m.meal_type} &bull; ${m.logged_at}</div>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div class="log-val positive">${m.calories} kcal</div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">P:${m.protein_g} C:${m.carbs_g} F:${m.fat_g}</div>
                    <div style="margin-top:4px;">
                        <button class="btn btn-sm btn-outline" style="padding:2px 6px;" onclick="openEditMeal(${m.id})"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-sm btn-danger" style="padding:2px 6px;" onclick="deleteMeal(${m.id})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            </div>
        `;
    });
    
    document.getElementById('total-protein').textContent = tp.toFixed(1) + 'g';
    document.getElementById('total-carbs').textContent = tc.toFixed(1) + 'g';
    document.getElementById('total-fat').textContent = tf.toFixed(1) + 'g';
}

async function submitMeal(e) {
    e.preventDefault();
    const id = document.getElementById('n-edit-id').value;
    const body = {
        meal_name: document.getElementById('n-name').value,
        meal_type: document.getElementById('n-type').value,
        calories: parseInt(document.getElementById('n-calories').value),
        protein_g: parseFloat(document.getElementById('n-protein').value),
        carbs_g: parseFloat(document.getElementById('n-carbs').value),
        fat_g: parseFloat(document.getElementById('n-fat').value)
    };
    
    try {
        let res;
        if (id) {
            res = await fetch(`/api/nutrition/${id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(body)
            });
        } else {
            res = await fetch('/api/nutrition', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(body)
            });
        }
        if (res.ok) {
            closeModal('nutrition-modal');
            document.getElementById('nutrition-form').reset();
            document.getElementById('n-edit-id').value = '';
            showToast('Meal saved');
            loadNutrition();
            loadDashboard();
        }
    } catch (err) {}
}

function openEditMeal(id) {
    const m = cachedMeals.find(x => x.id === id);
    if (!m) return;
    document.getElementById('n-edit-id').value = m.id;
    document.getElementById('n-name').value = m.meal_name;
    document.getElementById('n-type').value = m.meal_type;
    document.getElementById('n-calories').value = m.calories;
    document.getElementById('n-protein').value = m.protein_g;
    document.getElementById('n-carbs').value = m.carbs_g;
    document.getElementById('n-fat').value = m.fat_g;
    document.getElementById('nutrition-modal-title').textContent = 'Edit Meal Entry';
    openModal('nutrition-modal');
}

async function deleteMeal(id) {
    if (!confirm('Delete this meal?')) return;
    try {
        const res = await fetch(`/api/nutrition/${id}`, {method: 'DELETE'});
        if (res.ok) {
            showToast('Meal deleted');
            loadNutrition();
            loadDashboard();
        }
    } catch (e) {}
}

// ANALYTICS & WEIGHT
async function loadAnalytics() {
    try {
        const res = await fetch('/api/weight-logs');
        if (!res.ok) return;
        const data = await res.json();
        if (typeof updateWeightTrendChart === 'function') {
            updateWeightTrendChart(data);
        }
    } catch (e) {}
}

async function submitWeight(e) {
    e.preventDefault();
    const w = parseFloat(document.getElementById('wl-weight').value);
    try {
        const res = await fetch('/api/weight-logs', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({weight_kg: w})
        });
        if (res.ok) {
            closeModal('weight-modal');
            document.getElementById('weight-form').reset();
            showToast('Weight logged');
            loadAnalytics();
        }
    } catch (e) {}
}

// GOALS & BADGES
async function loadGoalsAndBadges() {
    try {
        const res = await fetch('/api/goals');
        const data = await res.json();
        
        const gCont = document.getElementById('goals-container');
        gCont.innerHTML = '';
        data.goals.forEach(g => {
            const pct = Math.min(100, Math.round((g.current_value / g.target_value) * 100)) || 0;
            gCont.innerHTML += `
                <div class="goal-card glass-card">
                    <div class="goal-header">
                        <div class="goal-title">${g.title}</div>
                        <button class="btn btn-sm btn-danger" style="padding:2px 6px;" onclick="deleteGoal(${g.id})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                    <div class="goal-val">${g.current_value} / ${g.target_value} ${g.unit}</div>
                    <div class="progress-bar-bg mt-2" style="margin-top:8px;">
                        <div class="progress-bar-fill" style="width:${pct}%"></div>
                    </div>
                </div>
            `;
        });
        
        const bCont = document.getElementById('badges-container');
        bCont.innerHTML = '';
        data.badges.forEach(b => {
            bCont.innerHTML += `
                <div class="badge-card glass-card ${b.unlocked ? '' : 'locked'}">
                    <div class="badge-icon"><i class="fa-solid ${b.icon}"></i></div>
                    <div class="badge-name">${b.name}</div>
                    <div class="badge-desc">${b.description}</div>
                </div>
            `;
        });
    } catch (e) {}
}

async function submitGoal(e) {
    e.preventDefault();
    const body = {
        title: document.getElementById('g-title').value,
        target_value: parseFloat(document.getElementById('g-target').value),
        unit: document.getElementById('g-unit').value
    };
    try {
        const res = await fetch('/api/goals', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        });
        if (res.ok) {
            closeModal('goal-modal');
            document.getElementById('goal-form').reset();
            showToast('Goal added');
            loadGoalsAndBadges();
        }
    } catch (e) {}
}

async function deleteGoal(id) {
    if (!confirm('Delete this goal?')) return;
    try {
        const res = await fetch(`/api/goals/${id}`, {method: 'DELETE'});
        if (res.ok) {
            showToast('Goal deleted');
            loadGoalsAndBadges();
        }
    } catch (e) {}
}

// PROFILE
async function loadProfile() {
    try {
        const res = await fetch('/api/me');
        const user = await res.json();
        
        document.getElementById('p-username').value = user.username || '';
        document.getElementById('p-email').value = user.email || '';
        document.getElementById('p-weight').value = user.weight_kg || '';
        document.getElementById('p-height').value = user.height_cm || '';
        document.getElementById('p-calorie-goal').value = user.daily_calorie_goal || '';
        document.getElementById('p-water-goal').value = user.daily_water_goal_ml || '';
        document.getElementById('p-workout-goal').value = user.daily_workout_min_goal || '';
        
        const w = parseFloat(user.weight_kg);
        const h = parseFloat(user.height_cm) / 100;
        let bmi = '--', cat = '--';
        if (w && h) {
            bmi = (w / (h * h)).toFixed(1);
            if (bmi < 18.5) cat = 'Underweight';
            else if (bmi < 25) cat = 'Normal';
            else if (bmi < 30) cat = 'Overweight';
            else cat = 'Obese';
        }
        document.getElementById('p-bmi').textContent = bmi;
        document.getElementById('p-bmi-cat').textContent = cat;
        
    } catch (e) {}
}

async function submitProfile(e) {
    e.preventDefault();
    const body = {
        username: document.getElementById('p-username').value,
        email: document.getElementById('p-email').value,
        weight_kg: parseFloat(document.getElementById('p-weight').value),
        height_cm: parseFloat(document.getElementById('p-height').value),
        daily_calorie_goal: parseInt(document.getElementById('p-calorie-goal').value),
        daily_water_goal_ml: parseInt(document.getElementById('p-water-goal').value),
        daily_workout_min_goal: parseInt(document.getElementById('p-workout-goal').value)
    };
    try {
        const res = await fetch('/api/profile', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        });
        if (res.ok) {
            showToast('Profile updated');
            document.getElementById('user-display-name').textContent = body.username;
            loadProfile();
        }
    } catch (e) {}
}

function exportCSV() {
    window.location.href = '/api/export/csv';
}
