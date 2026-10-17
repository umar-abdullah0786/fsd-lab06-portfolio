-- Optional: the server also creates these automatically on startup.
CREATE DATABASE IF NOT EXISTS portfolio_db;
USE portfolio_db;

CREATE TABLE IF NOT EXISTS profile (
  id INT PRIMARY KEY DEFAULT 1,
  full_name VARCHAR(100) NOT NULL,
  title VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL,
  phone VARCHAR(30),
  location VARCHAR(100),
  about TEXT,
  github VARCHAR(255),
  linkedin VARCHAR(255),
  image VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  level INT NOT NULL DEFAULT 50
);

CREATE TABLE IF NOT EXISTS education (
  id INT AUTO_INCREMENT PRIMARY KEY,
  degree VARCHAR(120) NOT NULL,
  institution VARCHAR(150) NOT NULL,
  start_year VARCHAR(10),
  end_year VARCHAR(10),
  description TEXT
);

CREATE TABLE IF NOT EXISTS experience (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role VARCHAR(120) NOT NULL,
  company VARCHAR(150) NOT NULL,
  start_date VARCHAR(20),
  end_date VARCHAR(20),
  description TEXT
);

CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  description TEXT,
  tech VARCHAR(255),
  link VARCHAR(255),
  image VARCHAR(255)
);
