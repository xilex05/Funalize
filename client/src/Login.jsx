import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import "./App.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(
        "http://localhost:5000/api/auth/login",
        { email, password }
      );

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      navigate("/party-select");
    } catch (err) {
      setError(err.response?.data?.msg || "Login failed");
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
      <p className="tagline">The Ultimate Party Decision Maker</p>

      <div className="card">
        <form onSubmit={handleLogin}>
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p style={{ color: "red", paddingBottom: "25px" }}>{error}</p>}

          <button type="submit" className="enter-btn">
            LETS GO!
          </button>
        </form>

        <p className="signup-text">
          Need an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>

    </div>
  );
}

export default Login;