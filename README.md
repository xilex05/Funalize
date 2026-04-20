# Funalize

Funalize is a full-stack MERN web application that helps groups make party decisions together in real time. Users can create or join a party room, add food or game options, vote for choices, use a random picker, chat with members, and view live updates without refreshing the page.

The project uses a React frontend, an Express/Node.js backend, MongoDB for storage, JWT authentication, and Socket.IO for real-time room synchronization.

## Features

- User signup and login with JWT authentication.
- Password hashing using bcrypt before storing users in MongoDB.
- Protected frontend routes for logged-in users only.
- Host party creation with a unique party code.
- Join party flow using an existing party code.
- Real-time member list updates using Socket.IO rooms.
- Category tabs for Food, Games, and Music.
- Add and delete options in the active category.
- Voting mode with vote limits.
- Random mode with animated winner selection.
- Winner reveal overlay with confetti-style UI.
- Party chat with stored and live-updated messages.
- Host-only controls for changing category, selecting mode, and finalizing voting.

## Tech Stack

### Frontend

- React
- Vite
- React Router
- Axios
- Socket.IO Client
- Bootstrap Icons
- Custom CSS

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- Socket.IO
- JWT
- bcryptjs
- dotenv
- CORS

## Project Structure

```text
Funalize/
  client/
    src/
      App.jsx              Main frontend route setup
      main.jsx             React app entry point
      Login.jsx            Login page
      Signup.jsx           Signup page
      PrivateRoute.jsx     Protects authenticated pages
      PartySelection.jsx   Host or join party screen
      PartyPage.jsx        Main party room screen
      App.css              Shared auth/selection styles
      PartyPage.css        Party room UI styles
      index.css            Global styles
    package.json

  server/
    middleware/
      authMiddleware.js    Verifies JWT tokens
    models/
      User.js              User database schema
      Party.js             Party room database schema
    routes/
      auth.js              Register and login APIs
      party.js             Party, option, voting, random, and chat APIs
    server.js              Express, MongoDB, and Socket.IO setup
    package.json
```

## How The App Works

1. A user creates an account or logs in.
2. The backend returns a JWT token after successful login.
3. The user can host a new party or join using a party code.
4. When a party room opens, the frontend joins the matching Socket.IO room.
5. Users add options under the active category.
6. The host selects either Voting mode or Random mode.
7. In Voting mode, users vote and the host finalizes the result.
8. In Random mode, the backend selects a winner from the active category.
9. Socket.IO broadcasts updates to every connected user in the same party room.
10. Chat messages are saved and updated live for all room members.

## Setup Instructions

### 1. Clone or open the project

```bash
cd Funalize
```

### 2. Install backend dependencies

```bash
cd server
npm install
```

### 3. Create backend environment file

Create a `.env` file inside the `server` folder:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
PORT=5000
```

Example:

```env
MONGO_URI=mongodb://127.0.0.1:27017/funalize
JWT_SECRET=funalize_secret_key
PORT=5000
```

### 4. Start the backend

```bash
npm run dev
```

The backend runs on:

```text
http://localhost:5000
```

### 5. Install frontend dependencies

Open a new terminal:

```bash
cd client
npm install
```

### 6. Start the frontend

```bash
npm run dev
```

The frontend usually runs on:

```text
http://localhost:5173
```

## Backend API Summary

### Authentication APIs

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and receive JWT token |

### Party APIs

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/party/create` | Create a new party room |
| POST | `/api/party/join` | Join a party using party code |
| GET | `/api/party/:partyCode` | Get current party details |
| PUT | `/api/party/:partyCode/category` | Change active category |
| PUT | `/api/party/:partyCode/selection-mode` | Enable voting, random, or unlock |
| POST | `/api/party/:partyCode/add-option` | Add an option |
| DELETE | `/api/party/:partyCode/delete-option` | Delete an option |
| PUT | `/api/party/:partyCode/vote` | Vote or unvote an option |
| PUT | `/api/party/:partyCode/finalize-voting` | Finalize voting result |
| POST | `/api/party/:partyCode/chat` | Send a chat message |

## Socket.IO Events

The app uses Socket.IO to keep all users in the same party room synchronized.

Important events include:

- `joinPartyRoom`
- `partySnapshot`
- `membersUpdated`
- `categoryUpdated`
- `optionsUpdated`
- `modeUpdated`
- `votingFinalized`
- `randomFinalized`
- `chatUpdated`

## Important Files

- `client/src/PartyPage.jsx`: Handles the main party room UI and frontend logic.
- `server/routes/party.js`: Handles party creation, joining, options, voting, random mode, and chat.
- `server/routes/auth.js`: Handles signup and login.
- `server/middleware/authMiddleware.js`: Verifies logged-in users using JWT.
- `server/models/Party.js`: Defines how party data is stored in MongoDB.
- `server/server.js`: Starts the backend and configures Socket.IO.

## Notes For Submission

- Do not upload `node_modules`.
- Upload the source code as a zip file after removing installed dependencies.
- Add screenshots of login, signup, party selection, party room, voting, random mode, chat, and MongoDB data if required for the report.

## Future Improvements

- Add deployment support for cloud hosting.
- Add profile images for users.
- Add admin controls for removing members.
- Add stronger validation for duplicate option names.
- Add automated backend and frontend tests.
- Add refresh token support for longer sessions.
