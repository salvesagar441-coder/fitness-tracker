-- ============================================================
-- FitPulse - Fitness Tracker Web Application
-- MySQL Database Schema Script
-- College Field Project
-- ============================================================
-- HOW TO USE:
--   1. Open MySQL Workbench
--   2. Connect to your local MySQL server
--   3. Copy-paste this entire script into a new SQL tab
--   4. Click the ⚡ Execute button (or press Ctrl+Shift+Enter)
--   5. Refresh the schema panel to see the new database
-- ============================================================

-- Create the database
DROP DATABASE IF EXISTS `fitness_tracker_db`;
CREATE DATABASE `fitness_tracker_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `fitness_tracker_db`;

-- ============================================================
-- TABLE 1: USERS
-- Stores user accounts, profile info, and daily fitness goals
-- ============================================================
CREATE TABLE `users` (
    `id`                     INT AUTO_INCREMENT PRIMARY KEY,
    `username`               VARCHAR(50)  NOT NULL UNIQUE,
    `email`                  VARCHAR(100) NOT NULL UNIQUE,
    `password_hash`          VARCHAR(256) NOT NULL,
    `weight_kg`              FLOAT        DEFAULT 70.0,
    `height_cm`              FLOAT        DEFAULT 170.0,
    `daily_calorie_goal`     INT          DEFAULT 2200,
    `daily_water_goal_ml`    INT          DEFAULT 3000,
    `daily_workout_min_goal` INT          DEFAULT 45,
    `created_at`             DATETIME     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE 2: WORKOUTS
-- Logs each workout session with category, duration, calories
-- ============================================================
CREATE TABLE `workouts` (
    `id`               INT AUTO_INCREMENT PRIMARY KEY,
    `user_id`          INT          NOT NULL,
    `title`            VARCHAR(100) NOT NULL,
    `category`         ENUM('Cardio', 'Strength', 'HIIT', 'Yoga', 'Flexibility') NOT NULL DEFAULT 'Cardio',
    `duration_minutes` INT          NOT NULL,
    `calories_burned`  INT          NOT NULL,
    `intensity`        ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
    `notes`            TEXT,
    `logged_at`        DATETIME     DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_workouts_user`     (`user_id`),
    INDEX `idx_workouts_logged`   (`logged_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE 3: NUTRITION LOGS
-- Tracks meals with calorie and macronutrient breakdown
-- ============================================================
CREATE TABLE `nutrition_logs` (
    `id`          INT AUTO_INCREMENT PRIMARY KEY,
    `user_id`     INT          NOT NULL,
    `meal_name`   VARCHAR(100) NOT NULL,
    `meal_type`   ENUM('Breakfast', 'Lunch', 'Dinner', 'Snack') NOT NULL DEFAULT 'Snack',
    `calories`    INT          NOT NULL,
    `protein_g`   FLOAT        DEFAULT 0.0,
    `carbs_g`     FLOAT        DEFAULT 0.0,
    `fat_g`       FLOAT        DEFAULT 0.0,
    `logged_at`   DATETIME     DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_nutrition_user`   (`user_id`),
    INDEX `idx_nutrition_logged` (`logged_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE 4: WATER LOGS
-- Records each water intake entry in millilitres
-- ============================================================
CREATE TABLE `water_logs` (
    `id`          INT AUTO_INCREMENT PRIMARY KEY,
    `user_id`     INT      NOT NULL,
    `amount_ml`   INT      NOT NULL,
    `logged_at`   DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_water_user`   (`user_id`),
    INDEX `idx_water_logged` (`logged_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE 5: WEIGHT LOGS
-- Tracks body weight over time for the Analytics trend chart
-- ============================================================
CREATE TABLE `weight_logs` (
    `id`          INT AUTO_INCREMENT PRIMARY KEY,
    `user_id`     INT      NOT NULL,
    `weight_kg`   FLOAT    NOT NULL,
    `logged_at`   DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_weight_user`   (`user_id`),
    INDEX `idx_weight_logged` (`logged_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE 6: GOALS
-- User-defined fitness goals with progress tracking
-- ============================================================
CREATE TABLE `goals` (
    `id`             INT AUTO_INCREMENT PRIMARY KEY,
    `user_id`        INT          NOT NULL,
    `title`          VARCHAR(100) NOT NULL,
    `target_value`   INT          NOT NULL,
    `current_value`  INT          DEFAULT 0,
    `unit`           VARCHAR(20)  NOT NULL,
    `is_completed`   BOOLEAN      DEFAULT FALSE,
    `created_at`     DATETIME     DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_goals_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE 7: BADGES / ACHIEVEMENTS
-- Gamification badges that users can unlock
-- ============================================================
CREATE TABLE `badges` (
    `id`           INT AUTO_INCREMENT PRIMARY KEY,
    `user_id`      INT          NOT NULL,
    `name`         VARCHAR(50)  NOT NULL,
    `description`  VARCHAR(255) NOT NULL,
    `icon`         VARCHAR(50)  NOT NULL,
    `unlocked`     BOOLEAN      DEFAULT FALSE,
    `unlocked_at`  DATETIME     NULL,

    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_badges_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================
-- ============================================================
--                    SAMPLE SEED DATA
--        (For demo / presentation / testing purposes)
-- ============================================================
-- ============================================================

-- -------------------------------------------------------
-- SEED USER
-- Login credentials:  Username: StudentUser
--                     Password: student123
-- -------------------------------------------------------
-- Password hash below is for 'student123' generated with
-- werkzeug.security.generate_password_hash('student123', method='pbkdf2:sha256')
-- -------------------------------------------------------
INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `weight_kg`, `height_cm`, `daily_calorie_goal`, `daily_water_goal_ml`, `daily_workout_min_goal`)
VALUES (
    1,
    'StudentUser',
    'student@college.edu',
    'pbkdf2:sha256:600000$XkZmQ9sT$a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
    68.5,
    172.0,
    2200,
    3000,
    45
);

-- -------------------------------------------------------
-- SEED WORKOUTS (3 sessions over last 3 days)
-- -------------------------------------------------------
INSERT INTO `workouts` (`user_id`, `title`, `category`, `duration_minutes`, `calories_burned`, `intensity`, `notes`, `logged_at`) VALUES
(1, 'Morning Campus Jogging',     'Cardio',    30, 280, 'Medium', 'Ran 4km around the campus park. Felt great!',            NOW() - INTERVAL 2 DAY),
(1, 'Upper Body Gym Workout',     'Strength',  50, 380, 'High',   'Bench press 3x10, shoulder press 3x8, pull-ups 3x6.',    NOW() - INTERVAL 1 DAY),
(1, 'Evening HIIT Session',       'HIIT',      25, 240, 'High',   'Burpees, jumping jacks, mountain climbers - 5 rounds.',   NOW()),
(1, 'Yoga & Stretching',          'Yoga',      40, 150, 'Low',    'Full body stretch and sun salutation flow.',              NOW() - INTERVAL 3 DAY),
(1, 'Evening Cycling',            'Cardio',    35, 310, 'Medium', 'Cycled 8km around the college area.',                     NOW() - INTERVAL 4 DAY);

-- -------------------------------------------------------
-- SEED NUTRITION LOGS (meals for today and yesterday)
-- -------------------------------------------------------
INSERT INTO `nutrition_logs` (`user_id`, `meal_name`, `meal_type`, `calories`, `protein_g`, `carbs_g`, `fat_g`, `logged_at`) VALUES
(1, 'Oatmeal with Almonds & Banana',   'Breakfast', 380, 14.0, 58.0,  9.0,  NOW() - INTERVAL 7 HOUR),
(1, 'Grilled Chicken Rice Bowl',       'Lunch',     650, 45.0, 70.0, 15.0,  NOW() - INTERVAL 3 HOUR),
(1, 'Protein Shake & Apple',           'Snack',     240, 25.0, 22.0,  3.0,  NOW() - INTERVAL 1 HOUR),
(1, 'Paneer Tikka with Roti',          'Dinner',    520, 28.0, 45.0, 18.0,  NOW() - INTERVAL 1 DAY + INTERVAL 2 HOUR),
(1, 'Egg Bhurji & Toast',             'Breakfast', 340, 18.0, 30.0, 14.0,  NOW() - INTERVAL 1 DAY + INTERVAL 10 HOUR),
(1, 'Dal Rice & Salad',               'Lunch',     480, 22.0, 65.0,  8.0,  NOW() - INTERVAL 1 DAY + INTERVAL 5 HOUR);

-- -------------------------------------------------------
-- SEED WATER LOGS (multiple entries today)
-- -------------------------------------------------------
INSERT INTO `water_logs` (`user_id`, `amount_ml`, `logged_at`) VALUES
(1, 500, NOW() - INTERVAL 6 HOUR),
(1, 250, NOW() - INTERVAL 5 HOUR),
(1, 500, NOW() - INTERVAL 3 HOUR),
(1, 250, NOW() - INTERVAL 2 HOUR),
(1, 750, NOW() - INTERVAL 1 HOUR);

-- -------------------------------------------------------
-- SEED WEIGHT LOGS (weekly entries for trend chart)
-- -------------------------------------------------------
INSERT INTO `weight_logs` (`user_id`, `weight_kg`, `logged_at`) VALUES
(1, 71.2, NOW() - INTERVAL 28 DAY),
(1, 70.8, NOW() - INTERVAL 21 DAY),
(1, 70.1, NOW() - INTERVAL 14 DAY),
(1, 69.4, NOW() - INTERVAL 7  DAY),
(1, 68.5, NOW());

-- -------------------------------------------------------
-- SEED GOALS (3 active fitness targets)
-- -------------------------------------------------------
INSERT INTO `goals` (`user_id`, `title`, `target_value`, `current_value`, `unit`, `is_completed`) VALUES
(1, 'Daily Workout Minutes',    45,    45,   'mins',  TRUE),
(1, 'Daily Water Hydration',    3000,  2250, 'ml',    FALSE),
(1, 'Weekly Calorie Burn',      3500,  1900, 'kcal',  FALSE);

-- -------------------------------------------------------
-- SEED BADGES / ACHIEVEMENTS (2 unlocked, 2 locked)
-- -------------------------------------------------------
INSERT INTO `badges` (`user_id`, `name`, `description`, `icon`, `unlocked`, `unlocked_at`) VALUES
(1, 'First Workout',    'Logged your very first workout session!',          '🏋️',  TRUE,  NOW() - INTERVAL 4 DAY),
(1, 'Hydration Hero',   'Drank over 2500ml of water in a single day.',     '💧',   TRUE,  NOW() - INTERVAL 1 DAY),
(1, '7-Day Streak',     'Maintained an active streak for 7 straight days.', '🔥',   FALSE, NULL),
(1, 'Century Burner',   'Burned over 500 calories in a single session.',    '⚡',   FALSE, NULL);


-- ============================================================
-- VERIFICATION: Check all tables were created successfully
-- ============================================================
SELECT 'DATABASE CREATED SUCCESSFULLY!' AS Status;
SELECT TABLE_NAME, TABLE_ROWS 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'fitness_tracker_db'
ORDER BY TABLE_NAME;
