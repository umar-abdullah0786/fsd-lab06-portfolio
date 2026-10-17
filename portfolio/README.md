# Dynamic Personal Portfolio (Lab 06)

Stack: HTML + CSS, jQuery AJAX, Node.js/Express, MySQL.

## Run it
1. Install Node.js and MySQL (or XAMPP/WAMP and start MySQL).
2. In this folder run: `npm install`
3. Open `server.js` and set your MySQL user/password in the `DB` block
   (or set env vars DB_USER, DB_PASSWORD, DB_HOST, DB_NAME).
4. `npm start`
5. Open http://localhost:3000

The database `portfolio_db` and all tables are created automatically on first start
(`schema.sql` is included only for reference).

## Features
- First visit: setup screen asks for your profile; edit it later with "Edit Profile".
- Add / edit / delete: Skills, Education, Experience, Projects.
- Upload / replace / remove profile image; optional project images.
- All data loads and saves via jQuery AJAX (no page reload).
- Data lives in MySQL, so it survives refresh and server restart.
- Server-side validation (required fields, email, URLs, skill level 0-100, image type/size).
- Responsive layout with a reusable modal form and card components.

## API
| Method | Endpoint | Purpose |
|---|---|---|
| GET | /api/profile | Read profile |
| POST | /api/profile | Create/update profile (multipart, image optional) |
| DELETE | /api/profile/image | Remove profile image |
| GET/POST | /api/{skills,education,experience,projects} | List / create |
| PUT/DELETE | /api/{...}/:id | Update / delete |
