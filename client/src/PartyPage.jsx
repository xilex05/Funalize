import { io } from "socket.io-client";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

const socket = io("http://localhost:5000", {
  autoConnect: false
});

function PartyPage() {
  const { partyCode } = useParams();
  const [party, setParty] = useState(null);
  const [isHost, setIsHost] = useState(false);

  const [optionInput, setOptionInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const token = localStorage.getItem("token");
  const currentUserId = token ? JSON.parse(atob(token.split(".")[1])).id : null;

  useEffect(() => {
    const handleConnect = () => {
      console.log("Connected:", socket.id);
      socket.emit("joinPartyRoom", partyCode);
    };

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

        if (data.host === currentUserId) {
          setIsHost(true);
        }
      }
    };

    fetchParty();

    const handleCategoryUpdate = (data) => {
      setParty(prev => ({
        ...prev,
        currentCategory: data.currentCategory,
        selectionMode: data.selectionMode ?? prev?.selectionMode ?? null,
        finalizedResult: data.finalizedResult ?? prev?.finalizedResult ?? null,
        foodOptions: data.foodOptions ?? prev?.foodOptions ?? [],
        gameOptions: data.gameOptions ?? prev?.gameOptions ?? []
      }));
    };

    const handleOptionsUpdate = (data) => {
      setParty(prev => ({
        ...prev,
        selectionMode: data.selectionMode ?? prev?.selectionMode ?? null,
        finalizedResult: data.finalizedResult ?? prev?.finalizedResult ?? null,
        foodOptions: data.foodOptions,
        gameOptions: data.gameOptions
      }));
    };

    const handleModeUpdate = (data) => {
      setParty(prev => ({
        ...prev,
        selectionMode: data.selectionMode
      }));
    };

    const handleVotingFinalized = (data) => {
      setParty(prev => ({
        ...prev,
        finalizedResult: data.finalizedResult
      }));
    };

    socket.on("categoryUpdated", handleCategoryUpdate);
    socket.on("optionsUpdated", handleOptionsUpdate);
    socket.on("modeUpdated", handleModeUpdate);
    socket.on("votingFinalized", handleVotingFinalized);
    socket.on("connect", handleConnect);

    socket.on("disconnect", () => {
      console.log("SOCKET DISCONNECTED");
    });

    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("categoryUpdated", handleCategoryUpdate);
      socket.off("optionsUpdated", handleOptionsUpdate);
      socket.off("modeUpdated", handleModeUpdate);
      socket.off("votingFinalized", handleVotingFinalized);
      socket.off("disconnect");
    };
  }, [partyCode, token, currentUserId]);

  if (!party) return <h2>Loading...</h2>;

  const activeOptions =
    party.currentCategory === "food" ? party.foodOptions : party.gameOptions;
  const allOptionsCount = party.foodOptions.length + party.gameOptions.length;
  const isModeLocked = Boolean(party.selectionMode);
  const isEditLockedForCurrentUser = isModeLocked && !isHost;
  const votingEnabled = party.selectionMode === "voting";

  const totalVotesByCurrentUser = activeOptions.reduce((count, option) => {
    return option.votes.some(v => v.toString() === currentUserId)
      ? count + 1
      : count;
  }, 0);

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

  const chooseSelectionMode = async (selectionMode) => {
    const res = await fetch(
      `http://localhost:5000/api/party/${partyCode}/selection-mode`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ selectionMode })
      }
    );

    const data = await res.json();

    if (res.ok) {
      setParty(data);
      setErrorMsg("");
    } else {
      setErrorMsg(data.msg || "Error setting mode");
    }
  };

  const deleteOption = async (optionName) => {
    const res = await fetch(
      `http://localhost:5000/api/party/${partyCode}/delete-option`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ optionName })
      }
    );

    const data = await res.json();

    if (res.ok) {
      setParty(data);
      setErrorMsg("");
    } else {
      setErrorMsg(data.msg || "Error deleting option");
    }
  };

  const voteOption = async (optionName) => {
    const res = await fetch(
      `http://localhost:5000/api/party/${partyCode}/vote`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ optionName })
      }
    );

    const data = await res.json();

    if (res.ok) {
      setParty(data);
      setErrorMsg("");
    } else {
      setErrorMsg(data.msg || "Error voting");
    }
  };

  const finalizeVoting = async () => {
    const res = await fetch(
      `http://localhost:5000/api/party/${partyCode}/finalize-voting`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await res.json();

    if (res.ok) {
      setParty(data);
      setErrorMsg("");
    } else {
      setErrorMsg(data.msg || "Error finalizing voting");
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
      <h3>
        Selection Mode: {party.selectionMode || "Not selected yet"}
      </h3>

      {!isHost && <p>Waiting for host...</p>}

      {isHost && (
        <div style={{ marginTop: "20px" }}>
          <h3>Mode Control</h3>
          <button
            disabled={allOptionsCount === 0}
            onClick={() => chooseSelectionMode("voting")}
          >
            Voting Mode
          </button>
          <button
            disabled={allOptionsCount === 0}
            onClick={() => chooseSelectionMode("random")}
            style={{ marginLeft: "8px" }}
          >
            Random Mode
          </button>
          <button
            onClick={() => chooseSelectionMode(null)}
            style={{ marginLeft: "8px" }}
          >
            Unlock Editing
          </button>
          {allOptionsCount === 0 && (
            <p style={{ color: "gray" }}>Add options before locking mode.</p>
          )}
        </div>
      )}

      {party.currentCategory !== "music" && (
        <div style={{ marginTop: "30px" }}>
          <h3>Add Option</h3>

          <input
            type="text"
            value={optionInput}
            onChange={(e) => setOptionInput(e.target.value)}
            placeholder="Enter option name"
            disabled={isEditLockedForCurrentUser}
          />

          <button onClick={addOption} disabled={isEditLockedForCurrentUser}>Add</button>

          {isEditLockedForCurrentUser && (
            <p style={{ color: "gray" }}>
              Options are locked after host selected {party.selectionMode} mode.
            </p>
          )}

          {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}
        </div>
      )}

      {party.currentCategory !== "music" && (
        <div style={{ marginTop: "30px" }}>
          <h3>Options:</h3>
          {votingEnabled ? (
            <p>Your votes used: {totalVotesByCurrentUser}/2</p>
          ) : (
            <p>Voting is available only in voting mode.</p>
          )}
          {isHost && votingEnabled && (
            <button onClick={finalizeVoting}>Finalize Voting</button>
          )}

          {party.finalizedResult?.category === party.currentCategory && (
            <p style={{ marginTop: "10px", fontWeight: "bold" }}>
              Winner: {party.finalizedResult.optionName} ({party.finalizedResult.votes} votes)
            </p>
          )}

          {activeOptions.map((option, index) => {
            const alreadyVoted = option.votes.some(
              v => v.toString() === currentUserId
            );
            const addedById =
              typeof option.addedBy === "object"
                ? option.addedBy?._id
                : option.addedBy;
            const canDelete = isHost || String(addedById) === String(currentUserId);

            return (
              <div key={index}>
                {option.name} (Votes: {option.votes.length})
                {" "}
                <button
                  onClick={() => voteOption(option.name)}
                  disabled={
                    !votingEnabled ||
                    (!alreadyVoted && totalVotesByCurrentUser >= 2)
                  }
                >
                  {alreadyVoted ? "Unvote" : "Vote"}
                </button>
                {" "}
                {canDelete && (
                  <button
                    onClick={() => deleteOption(option.name)}
                    disabled={isEditLockedForCurrentUser}
                  >
                    Delete My Option
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PartyPage;
