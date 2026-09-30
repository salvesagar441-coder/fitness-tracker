# 🏋️ FitPulse - Fitness Tracker Web Application

### College Field Project | Python Flask + MySQL + Modern UI

A full-featured fitness tracking web application with a sleek dark glassmorphism interface. Track workouts, nutrition, water intake, body weight, goals, and achievements — all connected to a MySQL database.

---

## 🛠️ Tech Stack

| Layer       | Technology                                      |
|-------------|------------------------------------------------|
| Backend     | Python 3 + Flask (REST API)                     |
| Frontend    | HTML5 / CSS3 / Vanilla JavaScript + Chart.js    |
| Database    | MySQL (via MySQL Workbench)                     |
| ORM         | Flask-SQLAlchemy + PyMySQL                      |
| Auth        | Werkzeug password hashing + Flask sessions      |
| Design      | Dark Glassmorphism, Google Fonts, Font Awesome  |

---

## 📁 Project Structure

```
fitness_tracker/
├── app.py                  # Flask app + all API routes
├── config.py               # MySQL database configuration
├── models.py               # 7 SQLAlchemy ORM models
├── requirements.txt        # Python dependencies
├── schema.sql              # MySQL schema (run in Workbench)
├── README.md               # This file
├── static/
│   ├── css/style.css       # Dark glassmorphism design
│   └── js/
│       ├── app.js          # Main application logic
│       └── charts.js       # Chart.js visualizations
└── templates/
    └── index.html          # Single-page app template
```

---

## 🚀 How to Run

### Step 1: Setup MySQL Database
1. Open **MySQL Workbench**
2. Connect to your local MySQL server
3. Open `schema.sql` or copy-paste its contents into a new SQL tab
4. Click **⚡ Execute** (Ctrl+Shift+Enter)
5. Verify: you should see `fitness_tracker_db` with 7 tables

### Step 2: Install Python Dependencies
```bash
cd fitness_tracker
pip install -r requirements.txt
```

### Step 3: Start the Server
```bash
python app.py
```
You should see: `Running on http://127.0.0.1:5000`

### Step 4: Open in Browser
```
http://localhost:5000
```

### Step 5: Login
- **Username:** `StudentUser`
- **Password:** `student123`
- Or create a new account via Sign Up

---

## ✨ Features

### 📊 Dashboard
- Daily metrics: Calories Burned, Active Minutes, Water Intake, BMI
- Weekly Calorie Balance bar chart (Burned vs Consumed)
- Macronutrient donut chart (Protein / Carbs / Fat)
- Recent activity feed

### 🏋️ Workout Tracking
- Log workouts: Cardio, Strength, HIIT, Yoga, Flexibility
- Track duration, calories burned, intensity
- Edit and delete workout entries
- Filter by category

### 🍽️ Nutrition Tracking
- Log meals with full macro breakdown (Protein, Carbs, Fat)
- Categorize: Breakfast, Lunch, Dinner, Snack
- Daily macro totals summary
- Edit and delete meal entries

### 💧 Water Intake
- Quick-add water buttons (+250ml)
- Daily water tracking vs goal

### 📈 Analytics
- Body weight progress trend chart
- Log weight entries over time

### 🏆 Goals & Badges
- Create custom fitness goals with progress bars
- Achievement badges (unlockable)
- Track completion status

### 👤 Profile & Settings
- Edit profile info and daily goals
- BMI calculation with category
- CSV data export
- Logout

---

## 🗄️ Database Schema (7 Tables)

| Table           | Purpose                    |
|-----------------|----------------------------|
| users           | User accounts & profiles   |
| workouts        | Workout session logs       |
| nutrition_logs  | Meal & food tracking       |
| water_logs      | Water intake records       |
| weight_logs     | Body weight history        |
| goals           | Fitness targets            |
| badges          | Achievement badges         |

---

## ⚙️ Configuration

MySQL connection settings are in `config.py`:
- **Host:** localhost
- **Port:** 3306
- **User:** root
- **Password:** (empty)
- **Database:** fitness_tracker_db

To change these, edit `config.py` or set environment variables.

---

## 📝 License

This project is created for educational purposes as a college field project.
