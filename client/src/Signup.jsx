import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import "./App.css";

function Signup() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();

    try {
      await axios.post(
        "http://localhost:5000/api/auth/register",
        { username, email, password }
      );

      navigate("/");
    } catch (err) {
      setError(err.response?.data?.msg || "Signup failed");
    }
  };

  return (
    <div className="container">

      <div className="logo-icons">
        <i className="bi bi-fork-knife"></i>
        <i className="bi bi-controller"></i>
        <i className="bi bi-music-note-beamed"></i>
      </div>

      <h1 className="logo-text">FUNALIZE</h1>
      <p className="tagline">Create Your Party Account</p>

      <div className="card">
        <form onSubmit={handleSignup}>
          <div className="input-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Create password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p style={{ color: "red" }}>{error}</p>}

          <button type="submit" className="enter-btn">
            CREATE ACCOUNT
          </button>
        </form>

        <p className="signup-text">
          Already have an account? <Link to="/">Login</Link>
        </p>
      </div>

    </div>
  );
}

export default Signup;