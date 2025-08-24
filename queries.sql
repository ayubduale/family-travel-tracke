DROP TABLE IF EXISTS visited_countries, users, countries;

CREATE TABLE users(
  id SERIAL PRIMARY KEY,
  name VARCHAR(15) UNIQUE NOT NULL,
  color VARCHAR(15)
);

CREATE TABLE countries(
  country_code CHAR(2) PRIMARY KEY,
  country_name VARCHAR(50) NOT NULL
);

CREATE TABLE visited_countries(
  id SERIAL PRIMARY KEY,
  country_code CHAR(2) NOT NULL REFERENCES countries(country_code),
  user_id INTEGER REFERENCES users(id),
  CONSTRAINT unique_user_country UNIQUE (country_code, user_id)
);

INSERT INTO users (name, color)
VALUES ('Angela', 'teal'), ('Jack', 'powderblue');

INSERT INTO countries (country_code, country_name)
VALUES 
  ('FR', 'France'),
  ('GB', 'United Kingdom'),
  ('CA', 'Canada'),
  ('US', 'United States');

INSERT INTO visited_countries (country_code, user_id)
VALUES ('FR', 1), ('GB', 1), ('CA', 2), ('FR', 2);

SELECT *
FROM visited_countries
JOIN users ON users.id = user_id;