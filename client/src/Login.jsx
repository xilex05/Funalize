import { Link } from "react-router-dom";
import "./App.css";

function Login() {
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
        <div className="input-group">
          <label>Username</label>
          <input type="text" placeholder="Enter your name" />
        </div>

        <div className="input-group">
          <label>Password</label>
          <input type="password" placeholder="••••••••" />
        </div>

        <button className="enter-btn">ENTER PARTY</button>

        <p className="signup-text">
          Need an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>

    </div>
  );
}

export default Login;
