# Quiz Builder

A web-based Quiz Builder application that allows creators to create and manage quizzes while enabling users to participate in quizzes and view their results.

## About the Project

Quiz Builder is a frontend web application developed using HTML, CSS, and JavaScript. It provides a simple and interactive platform for creating quizzes, attempting questions, and evaluating performance.

The application uses Local Storage to store user details, quiz data, and quiz attempts within the browser.

## Features

- User Signup and Login
- Interactive Admin Dashboard
- Create and Manage Quizzes
- Support for Multiple-Choice, True/False, and Text-Based Questions
- Join Quizzes Using a Quiz Code
- Timer-Based Quiz Attempts
- Automatic Submission and Score Calculation
- Instant Result Display
- Local Storage for Data Persistence
- Responsive and User-Friendly Interface

## Modules

### 1. Authentication
- User registration
- User login
- Local Storage-based authentication

### 2. Admin Module
- Create and manage quizzes
- Add questions and answers
- Publish quizzes
- View quiz statistics

### 3. User Module
- Join quizzes using a quiz code
- Attempt quiz questions
- Submit answers
- View scores and results

## Technologies Used

- HTML5
- CSS3
- JavaScript
- Browser Local Storage
- Git & GitHub

## Project Structure

Quiz-Builder/
├── Authentication/   # Login and Signup
├── Admin/            # Quiz creation and management
├── User/             # Quiz participation and results
├── Shared/           # Common JavaScript, CSS, and storage logic
└── README.md

## How to Run the Project

1. Clone or download this repository.
2. Open the project folder in Visual Studio Code.
3. Install the Live Server extension if it is not already installed.
4. Open `Authentication/index.html`.
5. Right-click and select **Open with Live Server**.
6. Sign up or log in to explore the application.

## Data Storage

Quiz Builder uses browser Local Storage to save user information, quizzes, and quiz attempts.

**Note:** Data is stored locally in the browser and is not synchronized across different devices or browsers. A backend database is not included in this version.

## Team Project

This project was developed collaboratively as part of the Frontend Development Frameworks coursework.

- Authentication Module
- Admin Module
- User Module

## Future Enhancements

- Backend and database integration
- Cross-device quiz sharing
- Enhanced quiz analytics
- Additional question types
- Improved user and quiz management

## License

This project was developed for academic and educational purposes.
