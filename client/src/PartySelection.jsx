import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

function PartySelection() {
  const navigate = useNavigate();
  const [partyCode, setPartyCode] = useState("");
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  const handleHost = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/party/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.msg || "Could not create party");
        return;
      }

      navigate(`/party/${data.partyCode}`);
    } catch (_err) {
      setError("Could not create party");
    }
  };

  const handleJoin = async () => {
    if (!partyCode.trim()) {
      setError("Please enter a party code");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/party/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ partyCode })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.msg || "Failed to join party");
        return;
      }

      setError("");
      navigate(`/party/${data.partyCode}`);
    } catch (_err) {
      setError("Failed to join party");
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
      <p className="tagline">Host or join your party room</p>

      <div className="card party-select-card">
        <button type="button" className="enter-btn" onClick={handleHost}>
          <i className="bi bi-stars"></i>
          Host Party
        </button>

        <div className="party-select-divider">
          <span>OR JOIN WITH CODE</span>
        </div>

        <div className="input-group">
          <label>Party Code</label>
          <input
            type="text"
            placeholder="Enter Party Code"
            value={partyCode}
            onChange={(e) => setPartyCode(e.target.value.toUpperCase())}
          />
        </div>

        {error && <p className="party-select-error">{error}</p>}

        <button type="button" className="enter-btn party-join-btn" onClick={handleJoin}>
          <i className="bi bi-box-arrow-in-right"></i>
          Join Party
        </button>
      </div>
    </div>
  );
}

export default PartySelection;
