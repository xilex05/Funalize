import { Link } from "react-router-dom";
import "./App.css";

function Signup() {
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
        <div className="input-group">
          <label>Username</label>
          <input type="text" placeholder="Choose a username" />
        </div>

        <div className="input-group">
          <label>Email</label>
          <input type="email" placeholder="Enter your email" />
        </div>

        <div className="input-group">
          <label>Password</label>
          <input type="password" placeholder="Create password" />
        </div>

        <button className="enter-btn">CREATE ACCOUNT</button>

        <p className="signup-text">
          Already have an account? <Link to="/">Login</Link>
        </p>
      </div>

    </div>
  );
}

export default Signup;
