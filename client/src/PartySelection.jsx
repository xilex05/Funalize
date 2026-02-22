import { useState } from "react";
import { useNavigate } from "react-router-dom";

function PartySelection() {
  const navigate = useNavigate();
  const [partyCode, setPartyCode] = useState("");

  const token = localStorage.getItem("token");

  const handleHost = async () => {
    const res = await fetch("http://localhost:5000/api/party/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    navigate(`/party/${data.partyCode}`);
  };

const handleJoin = async () => {
  if (!partyCode.trim()) {
    alert("Please enter a party code");
    return;
  }

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
    alert(data.msg || "Failed to join party");
    return;
  }

  navigate(`/party/${data.partyCode}`);
};

  return (
    <div>
      <h2>Host or Join Party</h2>

      <button onClick={handleHost}>Host Party</button>

      <div>
        <input
          type="text"
          placeholder="Enter Party Code"
          value={partyCode}
          onChange={(e) => setPartyCode(e.target.value)}
        />
        <button onClick={handleJoin}>Join Party</button>
      </div>
    </div>
  );
}

export default PartySelection;