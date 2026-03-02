import { io } from "socket.io-client";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";


const socket = io("http://localhost:5000");

function PartyPage() {
  const { partyCode } = useParams();
  const [party, setParty] = useState(null);
  const [isHost, setIsHost] = useState(false);

  const [optionInput, setOptionInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchParty = async () => {
      const res = await fetch(
        `http://localhost:5000/api/party/${partyCode}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await res.json();

      if (res.ok) {
        setParty(data);

        const userId = JSON.parse(
          atob(token.split(".")[1])
        ).id;

        if (data.host === userId) {
          setIsHost(true);
        }
      }
    };

    fetchParty();

    socket.emit("joinPartyRoom", partyCode);

    const handleCategoryUpdate = (data) => {
      setParty(prev => ({
        ...prev,
        currentCategory: data.currentCategory
      }));
    };

    socket.on("categoryUpdated", handleCategoryUpdate);

    return () => {
      socket.off("categoryUpdated", handleCategoryUpdate);
    };

  }, [partyCode]);

  if (!party) return <h2>Loading...</h2>;

  const changeCategory = async (category) => {
    const res = await fetch(
      `http://localhost:5000/api/party/${partyCode}/category`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ category })
      }
    );

    const data = await res.json();

    if (res.ok) {
      setParty(data);
    }
  };

  const addOption = async () => {
  if (!optionInput.trim()) return;

  const res = await fetch(
    `http://localhost:5000/api/party/${partyCode}/add-option`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name: optionInput })
    }
  );

  const data = await res.json();

  if (res.ok) {
    setParty(data);
    setOptionInput("");
    setErrorMsg("");
  } else {
    setErrorMsg(data.msg || "Error adding option");
  }
};

  return (
    <div>
      <h1>Party Code: {party.partyCode}</h1>

      <div style={{ marginTop: "20px" }}>
        <button disabled={!isHost} onClick={() => changeCategory("food")}>
          Food
        </button>

        <button disabled={!isHost} onClick={() => changeCategory("games")}>
          Games
        </button>

        <button disabled={!isHost} onClick={() => changeCategory("music")}>
          Music
        </button>
      </div>

      <h2 style={{ marginTop: "30px" }}>
        Current Category: {party.currentCategory}
      </h2>

      {!isHost && <p>Waiting for host...</p>}

      {/* 🔥 ADD OPTION SECTION */}
      {party.currentCategory !== "music" && (
        <div style={{ marginTop: "30px" }}>
          <h3>Add Option</h3>

          <input
            type="text"
            value={optionInput}
            onChange={(e) => setOptionInput(e.target.value)}
            placeholder="Enter option name"
          />

          <button onClick={addOption}>Add</button>

          {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}
        </div>
      )}

      {/* 🔥 OPTIONS LIST */}
      {party.currentCategory !== "music" && (
        <div style={{ marginTop: "30px" }}>
          <h3>Options:</h3>

          {(party.currentCategory === "food"
            ? party.foodOptions
            : party.gameOptions
          ).map((option, index) => (
            <div key={index}>
              {option.name} (Votes: {option.votes})
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PartyPage;