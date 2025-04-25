# Job Portal

A modern job portal application built with Node.js, Express, and MySQL.

## Features

- User Authentication (Register/Login)
- Job Posting and Management
- Location-based Job Sorting
- Contact System with WhatsApp Integration
- Profile Management
- Dark/Light Theme Toggle
- Responsive Design

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm (Node Package Manager)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd jobfinder
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following content:
```
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=job_portal
SESSION_SECRET=your_session_secret
```

4. Set up the database:
```bash
mysql -u root -p < schema.sql
```

## Running the Application

1. Start the server:
```bash
node server.js
```

2. Access the application at:
```
http://localhost:3000
```

## Project Structure

- `server.js` - Main application file
- `public/` - Static files
  - `index.html` - Main HTML file
  - `js/main.js` - Client-side JavaScript
- `schema.sql` - Database schema
- `.env` - Environment variables

## Security Considerations

- All passwords are hashed using bcrypt
- Session-based authentication
- SQL injection protection
- XSS protection
- Environment variables for sensitive data

## Backup Instructions

1. Database Backup:
```bash
mysqldump -u root -p job_portal > backup.sql
```

2. Project Files Backup:
```bash
zip -r jobfinder_backup.zip . -x "node_modules/*"
```

## Dependencies

- express
- mysql2
- bcryptjs
- express-session
- multer
- dotenv

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 