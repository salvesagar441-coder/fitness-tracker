import os
import csv
import io
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, render_template, request, jsonify, session, make_response
from config import Config
from models import db, User, Workout, NutritionLog, WaterLog, WeightLog, Goal, Badge

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Login required'}), 401
        return f(*args, **kwargs)
    return decorated_function

def get_current_user():
    if 'user_id' in session:
        return User.query.get(session['user_id'])
    return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 400
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        user = User(
            username=data['username'],
            email=data['email']
        )
        user.set_password(data['password'])
        db.session.add(user)
        db.session.commit()
        return jsonify({'message': 'User created successfully', 'user': user.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        user = User.query.filter_by(username=data['username']).first()
        if user and user.check_password(data['password']):
            session['user_id'] = user.id
            return jsonify({'message': 'Logged in successfully', 'user': user.to_dict()}), 200
        return jsonify({'error': 'Invalid credentials'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/api/me', methods=['GET'])
@login_required
def me():
    user = get_current_user()
    if user:
        return jsonify(user.to_dict()), 200
    return jsonify({'error': 'User not found'}), 404

@app.route('/api/stats', methods=['GET'])
@login_required
def stats():
    try:
        user = get_current_user()
        today = datetime.utcnow().date()
        today_start = datetime(today.year, today.month, today.day)
        
        workouts = Workout.query.filter(Workout.user_id == user.id, Workout.logged_at >= today_start).all()
        calories_burned = sum(w.calories_burned for w in workouts)
        workout_minutes = sum(w.duration_minutes for w in workouts)
        
        nutrition = NutritionLog.query.filter(NutritionLog.user_id == user.id, NutritionLog.logged_at >= today_start).all()
        calories_consumed = sum(n.calories for n in nutrition)
        protein_g = sum(n.protein_g for n in nutrition)
        carbs_g = sum(n.carbs_g for n in nutrition)
        fat_g = sum(n.fat_g for n in nutrition)
        
        water = WaterLog.query.filter(WaterLog.user_id == user.id, WaterLog.logged_at >= today_start).all()
        water_ml = sum(w.amount_ml for w in water)
        
        bmi = round(user.weight_kg / ((user.height_cm / 100) ** 2), 1) if user.height_cm else 0
        if bmi < 18.5:
            bmi_category = 'Underweight'
        elif bmi < 25:
            bmi_category = 'Normal'
        elif bmi < 30:
            bmi_category = 'Overweight'
        else:
            bmi_category = 'Obese'
            
        today_stats = {
            'calories_burned': calories_burned,
            'workout_minutes': workout_minutes,
            'calories_consumed': calories_consumed,
            'protein_g': protein_g,
            'carbs_g': carbs_g,
            'fat_g': fat_g,
            'water_ml': water_ml,
            'water_goal_ml': user.daily_water_goal_ml,
            'calorie_goal': user.daily_calorie_goal,
            'workout_goal_min': user.daily_workout_min_goal,
            'bmi': bmi,
            'bmi_category': bmi_category
        }
        
        labels = []
        burned = []
        intake = []
        
        for i in range(6, -1, -1):
            day_date = today_start - timedelta(days=i)
            next_day_date = day_date + timedelta(days=1)
            
            day_workouts = Workout.query.filter(Workout.user_id == user.id, Workout.logged_at >= day_date, Workout.logged_at < next_day_date).all()
            day_nutrition = NutritionLog.query.filter(NutritionLog.user_id == user.id, NutritionLog.logged_at >= day_date, NutritionLog.logged_at < next_day_date).all()
            
            labels.append(day_date.strftime('%a'))
            burned.append(sum(w.calories_burned for w in day_workouts))
            intake.append(sum(n.calories for n in day_nutrition))
            
        weekly_chart = {
            'labels': labels,
            'burned': burned,
            'intake': intake
        }
        
        return jsonify({'today': today_stats, 'weekly_chart': weekly_chart}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/workouts', methods=['GET'])
@login_required
def get_workouts():
    user = get_current_user()
    workouts = Workout.query.filter_by(user_id=user.id).order_by(Workout.logged_at.desc()).all()
    return jsonify([w.to_dict() for w in workouts]), 200

@app.route('/api/workouts', methods=['POST'])
@login_required
def create_workout():
    try:
        data = request.get_json()
        workout = Workout(
            user_id=session['user_id'],
            title=data.get('title'),
            category=data.get('category', 'Cardio'),
            duration_minutes=data.get('duration_minutes'),
            calories_burned=data.get('calories_burned'),
            intensity=data.get('intensity', 'Medium'),
            notes=data.get('notes', '')
        )
        db.session.add(workout)
        db.session.commit()
        return jsonify(workout.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/workouts/<int:id>', methods=['PUT'])
@login_required
def update_workout(id):
    try:
        workout = Workout.query.get(id)
        if not workout or workout.user_id != session['user_id']:
            return jsonify({'error': 'Workout not found or unauthorized'}), 404
            
        data = request.get_json()
        workout.title = data.get('title', workout.title)
        workout.category = data.get('category', workout.category)
        workout.duration_minutes = data.get('duration_minutes', workout.duration_minutes)
        workout.calories_burned = data.get('calories_burned', workout.calories_burned)
        workout.intensity = data.get('intensity', workout.intensity)
        workout.notes = data.get('notes', workout.notes)
        
        db.session.commit()
        return jsonify(workout.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/workouts/<int:id>', methods=['DELETE'])
@login_required
def delete_workout(id):
    try:
        workout = Workout.query.get(id)
        if not workout or workout.user_id != session['user_id']:
            return jsonify({'error': 'Workout not found or unauthorized'}), 404
            
        db.session.delete(workout)
        db.session.commit()
        return jsonify({'message': 'Workout deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/nutrition', methods=['GET'])
@login_required
def get_nutrition():
    user = get_current_user()
    logs = NutritionLog.query.filter_by(user_id=user.id).order_by(NutritionLog.logged_at.desc()).all()
    return jsonify([n.to_dict() for n in logs]), 200

@app.route('/api/nutrition', methods=['POST'])
@login_required
def create_nutrition():
    try:
        data = request.get_json()
        log = NutritionLog(
            user_id=session['user_id'],
            meal_name=data.get('meal_name'),
            meal_type=data.get('meal_type'),
            calories=data.get('calories'),
            protein_g=data.get('protein_g', 0.0),
            carbs_g=data.get('carbs_g', 0.0),
            fat_g=data.get('fat_g', 0.0)
        )
        db.session.add(log)
        db.session.commit()
        return jsonify(log.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/nutrition/<int:id>', methods=['PUT'])
@login_required
def update_nutrition(id):
    try:
        log = NutritionLog.query.get(id)
        if not log or log.user_id != session['user_id']:
            return jsonify({'error': 'Log not found or unauthorized'}), 404
            
        data = request.get_json()
        log.meal_name = data.get('meal_name', log.meal_name)
        log.meal_type = data.get('meal_type', log.meal_type)
        log.calories = data.get('calories', log.calories)
        log.protein_g = data.get('protein_g', log.protein_g)
        log.carbs_g = data.get('carbs_g', log.carbs_g)
        log.fat_g = data.get('fat_g', log.fat_g)
        
        db.session.commit()
        return jsonify(log.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/nutrition/<int:id>', methods=['DELETE'])
@login_required
def delete_nutrition(id):
    try:
        log = NutritionLog.query.get(id)
        if not log or log.user_id != session['user_id']:
            return jsonify({'error': 'Log not found or unauthorized'}), 404
            
        db.session.delete(log)
        db.session.commit()
        return jsonify({'message': 'Log deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/water', methods=['GET'])
@login_required
def get_water():
    user = get_current_user()
    logs = WaterLog.query.filter_by(user_id=user.id).order_by(WaterLog.logged_at.desc()).all()
    return jsonify([w.to_dict() for w in logs]), 200

@app.route('/api/water', methods=['POST'])
@login_required
def create_water():
    try:
        data = request.get_json()
        log = WaterLog(
            user_id=session['user_id'],
            amount_ml=data.get('amount_ml')
        )
        db.session.add(log)
        db.session.commit()
        return jsonify(log.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/weight-logs', methods=['GET'])
@login_required
def get_weight_logs():
    user = get_current_user()
    logs = WeightLog.query.filter_by(user_id=user.id).order_by(WeightLog.logged_at.asc()).all()
    return jsonify([w.to_dict() for w in logs]), 200

@app.route('/api/weight-logs', methods=['POST'])
@login_required
def create_weight_log():
    try:
        data = request.get_json()
        weight_kg = data.get('weight_kg')
        log = WeightLog(
            user_id=session['user_id'],
            weight_kg=weight_kg
        )
        db.session.add(log)
        
        user = get_current_user()
        user.weight_kg = weight_kg
        
        db.session.commit()
        return jsonify(log.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/goals', methods=['GET'])
@login_required
def get_goals():
    user = get_current_user()
    goals = Goal.query.filter_by(user_id=user.id).all()
    badges = Badge.query.filter_by(user_id=user.id).all()
    return jsonify({
        'goals': [g.to_dict() for g in goals],
        'badges': [b.to_dict() for b in badges]
    }), 200

@app.route('/api/goals', methods=['POST'])
@login_required
def create_goal():
    try:
        data = request.get_json()
        goal = Goal(
            user_id=session['user_id'],
            title=data.get('title'),
            target_value=data.get('target_value'),
            unit=data.get('unit')
        )
        db.session.add(goal)
        db.session.commit()
        return jsonify(goal.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/goals/<int:id>', methods=['DELETE'])
@login_required
def delete_goal(id):
    try:
        goal = Goal.query.get(id)
        if not goal or goal.user_id != session['user_id']:
            return jsonify({'error': 'Goal not found or unauthorized'}), 404
            
        db.session.delete(goal)
        db.session.commit()
        return jsonify({'message': 'Goal deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile', methods=['PUT'])
@login_required
def update_profile():
    try:
        user = get_current_user()
        data = request.get_json()
        
        user.username = data.get('username', user.username)
        user.email = data.get('email', user.email)
        user.weight_kg = data.get('weight_kg', user.weight_kg)
        user.height_cm = data.get('height_cm', user.height_cm)
        user.daily_calorie_goal = data.get('daily_calorie_goal', user.daily_calorie_goal)
        user.daily_water_goal_ml = data.get('daily_water_goal_ml', user.daily_water_goal_ml)
        user.daily_workout_min_goal = data.get('daily_workout_min_goal', user.daily_workout_min_goal)
        
        db.session.commit()
        return jsonify(user.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/export/csv', methods=['GET'])
@login_required
def export_csv():
    try:
        user = get_current_user()
        
        si = io.StringIO()
        cw = csv.writer(si)
        
        cw.writerow(['--- WORKOUTS ---'])
        cw.writerow(['ID', 'Title', 'Category', 'Duration (min)', 'Calories Burned', 'Intensity', 'Notes', 'Date'])
        workouts = Workout.query.filter_by(user_id=user.id).all()
        for w in workouts:
            cw.writerow([w.id, w.title, w.category, w.duration_minutes, w.calories_burned, w.intensity, w.notes, w.logged_at])
            
        cw.writerow([])
        cw.writerow(['--- NUTRITION ---'])
        cw.writerow(['ID', 'Meal Name', 'Meal Type', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Date'])
        nutrition = NutritionLog.query.filter_by(user_id=user.id).all()
        for n in nutrition:
            cw.writerow([n.id, n.meal_name, n.meal_type, n.calories, n.protein_g, n.carbs_g, n.fat_g, n.logged_at])
            
        cw.writerow([])
        cw.writerow(['--- WATER ---'])
        cw.writerow(['ID', 'Amount (ml)', 'Date'])
        water = WaterLog.query.filter_by(user_id=user.id).all()
        for w in water:
            cw.writerow([w.id, w.amount_ml, w.logged_at])
            
        output = make_response(si.getvalue())
        output.headers["Content-Disposition"] = "attachment; filename=export.csv"
        output.headers["Content-type"] = "text/csv"
        return output
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def seed_db():
    with app.app_context():
        db.create_all()
        if not User.query.first():
            user = User(
                username='StudentUser',
                email='student@college.edu',
                weight_kg=68.5,
                height_cm=172.0,
                daily_calorie_goal=2200,
                daily_water_goal_ml=3000,
                daily_workout_min_goal=45
            )
            user.set_password('student123')
            db.session.add(user)
            db.session.commit()

            # Sample Workouts (spread across last few days)
            workouts = [
                Workout(user_id=user.id, title='Morning Campus Jogging', category='Cardio', duration_minutes=30, calories_burned=280, intensity='Medium', notes='Ran 4km around the campus park.', logged_at=datetime.utcnow() - timedelta(days=2)),
                Workout(user_id=user.id, title='Upper Body Gym Workout', category='Strength', duration_minutes=50, calories_burned=380, intensity='High', notes='Bench press 3x10, shoulder press 3x8, pull-ups 3x6.', logged_at=datetime.utcnow() - timedelta(days=1)),
                Workout(user_id=user.id, title='Evening HIIT Session', category='HIIT', duration_minutes=25, calories_burned=240, intensity='High', notes='Burpees, jumping jacks, mountain climbers - 5 rounds.', logged_at=datetime.utcnow()),
                Workout(user_id=user.id, title='Yoga & Stretching', category='Yoga', duration_minutes=40, calories_burned=150, intensity='Low', notes='Full body stretch and sun salutation flow.', logged_at=datetime.utcnow() - timedelta(days=3)),
                Workout(user_id=user.id, title='Evening Cycling', category='Cardio', duration_minutes=35, calories_burned=310, intensity='Medium', notes='Cycled 8km around the college area.', logged_at=datetime.utcnow() - timedelta(days=4)),
            ]
            db.session.add_all(workouts)

            # Sample Meals
            meals = [
                NutritionLog(user_id=user.id, meal_name='Oatmeal with Almonds & Banana', meal_type='Breakfast', calories=380, protein_g=14.0, carbs_g=58.0, fat_g=9.0, logged_at=datetime.utcnow() - timedelta(hours=7)),
                NutritionLog(user_id=user.id, meal_name='Grilled Chicken Rice Bowl', meal_type='Lunch', calories=650, protein_g=45.0, carbs_g=70.0, fat_g=15.0, logged_at=datetime.utcnow() - timedelta(hours=3)),
                NutritionLog(user_id=user.id, meal_name='Protein Shake & Apple', meal_type='Snack', calories=240, protein_g=25.0, carbs_g=22.0, fat_g=3.0, logged_at=datetime.utcnow() - timedelta(hours=1)),
                NutritionLog(user_id=user.id, meal_name='Paneer Tikka with Roti', meal_type='Dinner', calories=520, protein_g=28.0, carbs_g=45.0, fat_g=18.0, logged_at=datetime.utcnow() - timedelta(days=1, hours=-2)),
                NutritionLog(user_id=user.id, meal_name='Egg Bhurji & Toast', meal_type='Breakfast', calories=340, protein_g=18.0, carbs_g=30.0, fat_g=14.0, logged_at=datetime.utcnow() - timedelta(days=1, hours=-10)),
                NutritionLog(user_id=user.id, meal_name='Dal Rice & Salad', meal_type='Lunch', calories=480, protein_g=22.0, carbs_g=65.0, fat_g=8.0, logged_at=datetime.utcnow() - timedelta(days=1, hours=-5)),
            ]
            db.session.add_all(meals)

            # Sample Water Logs (today)
            water_logs = [
                WaterLog(user_id=user.id, amount_ml=500, logged_at=datetime.utcnow() - timedelta(hours=6)),
                WaterLog(user_id=user.id, amount_ml=250, logged_at=datetime.utcnow() - timedelta(hours=5)),
                WaterLog(user_id=user.id, amount_ml=500, logged_at=datetime.utcnow() - timedelta(hours=3)),
                WaterLog(user_id=user.id, amount_ml=250, logged_at=datetime.utcnow() - timedelta(hours=2)),
                WaterLog(user_id=user.id, amount_ml=750, logged_at=datetime.utcnow() - timedelta(hours=1)),
            ]
            db.session.add_all(water_logs)

            # Sample Weight Logs (weekly entries for trend chart)
            weight_logs = [
                WeightLog(user_id=user.id, weight_kg=71.2, logged_at=datetime.utcnow() - timedelta(days=28)),
                WeightLog(user_id=user.id, weight_kg=70.8, logged_at=datetime.utcnow() - timedelta(days=21)),
                WeightLog(user_id=user.id, weight_kg=70.1, logged_at=datetime.utcnow() - timedelta(days=14)),
                WeightLog(user_id=user.id, weight_kg=69.4, logged_at=datetime.utcnow() - timedelta(days=7)),
                WeightLog(user_id=user.id, weight_kg=68.5, logged_at=datetime.utcnow()),
            ]
            db.session.add_all(weight_logs)

            # Sample Goals
            goals = [
                Goal(user_id=user.id, title='Daily Workout Minutes', target_value=45, current_value=25, unit='mins', is_completed=False),
                Goal(user_id=user.id, title='Daily Water Hydration', target_value=3000, current_value=2250, unit='ml', is_completed=False),
                Goal(user_id=user.id, title='Weekly Calorie Burn', target_value=3500, current_value=1900, unit='kcal', is_completed=False),
            ]
            db.session.add_all(goals)

            # Sample Badges
            badges = [
                Badge(user_id=user.id, name='First Workout', description='Logged your very first workout session!', icon='🏋️', unlocked=True, unlocked_at=datetime.utcnow() - timedelta(days=4)),
                Badge(user_id=user.id, name='Hydration Hero', description='Drank over 2500ml of water in a single day.', icon='💧', unlocked=True, unlocked_at=datetime.utcnow() - timedelta(days=1)),
                Badge(user_id=user.id, name='7-Day Streak', description='Maintained an active streak for 7 straight days.', icon='🔥', unlocked=False),
                Badge(user_id=user.id, name='Century Burner', description='Burned over 500 calories in a single session.', icon='⚡', unlocked=False),
            ]
            db.session.add_all(badges)

            db.session.commit()
            print('[OK] Database seeded with sample data!')

if __name__ == '__main__':
    seed_db()
    app.run(debug=True, port=5000)

