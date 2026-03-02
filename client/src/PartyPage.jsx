import { io } from "socket.io-client";
import { useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import "./PartyPage.css";

const socket = io("http://localhost:5000", {
  autoConnect: false
});

const CATEGORY_META = {
  food: { label: "Food", icon: "bi bi-fork-knife" },
  games: { label: "Games", icon: "bi bi-controller" },
  music: { label: "Music", icon: "bi bi-music-note-beamed" },
  all: { label: "All", icon: "bi bi-stars" }
};

const CONFETTI_BITS = Array.from({ length: 36 }, (_, index) => ({
  id: index,
  left: `${(index * 2.75) % 100}%`,
  delay: `${(index % 9) * 0.07}s`,
  duration: `${1.6 + (index % 5) * 0.3}s`,
  rotate: `${(index * 37) % 360}deg`
}));

function getEntityId(value) {
  return String(value?._id || value || "");
}

function getEntityName(value) {
  if (!value || typeof value !== "object") {
    return "Member";
  }

  return value.username || value.email || "Member";
}

function normalizeChatMessages(messages) {
  if (!Array.isArray(messages) || !messages.length) {
    return [{ id: "welcome", user: "System", userId: "system", text: "Party chat is live. Keep it fun." }];
  }

  return messages.map((msg, index) => ({
    id: String(msg._id || msg.id || `${index}-${msg.text || "msg"}`),
    user: msg.user || "Member",
    userId: String(msg.userId?._id || msg.userId || ""),
    text: msg.text || ""
  }));
}

function PartyPage() {
  const { partyCode } = useParams();
  const [party, setParty] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [optionInput, setOptionInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [randomPickerItems, setRandomPickerItems] = useState([]);
  const [randomPickerTransition, setRandomPickerTransition] = useState("none");
  const [randomPickerOffset, setRandomPickerOffset] = useState(0);
  const [randomWinnerKey, setRandomWinnerKey] = useState("");
  const [randomHighlightReady, setRandomHighlightReady] = useState(false);
  const [showRandomPicker, setShowRandomPicker] = useState(false);
  const [winnerRevealReady, setWinnerRevealReady] = useState(true);
  const [winnerCardVisible, setWinnerCardVisible] = useState(false);
  const [discoMode, setDiscoMode] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState(normalizeChatMessages([]));

  const randomIntervalRef = useRef(null);
  const randomTimeoutRef = useRef(null);
  const winnerRevealTimeoutRef = useRef(null);
  const winnerCardTimeoutRef = useRef(null);

  const token = localStorage.getItem("token");
  const currentUserId = token ? JSON.parse(atob(token.split(".")[1])).id : null;

  useEffect(() => {
    const handleConnect = () => {
      socket.emit("joinPartyRoom", partyCode);
    };

    const revealWinnerCardWithTimer = () => {
      if (winnerCardTimeoutRef.current) {
        clearTimeout(winnerCardTimeoutRef.current);
      }

      setWinnerCardVisible(true);
      winnerCardTimeoutRef.current = setTimeout(() => {
        setWinnerCardVisible(false);
      }, 5000);
    };

    const fetchParty = async () => {
      const res = await fetch(`http://localhost:5000/api/party/${partyCode}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (res.ok) {
        setParty(data);
        setIsHost(getEntityId(data.host) === String(currentUserId));
        setChatMessages(normalizeChatMessages(data.chatMessages));
      }
    };

    const startRandomAnimation = (payload) => {
      const pool = payload?.randomPool || [];
      const winner = payload?.winner;

      if (!pool.length || !winner) {
        return false;
      }

      const itemWidth = 152;
      const viewportWidth = 500;
      const loops = 10;
      const expanded = Array.from({ length: loops }, () => pool).flat();
      const winnerKey = `${winner.category}:${winner.name}`;
      const winnerIndices = expanded
        .map((item, index) => ({
          key: `${item.category}:${item.name}`,
          index
        }))
        .filter((item) => item.key === winnerKey)
        .map((item) => item.index);

      const targetIndex =
        winnerIndices.find((index) => index >= pool.length * 6) ??
        winnerIndices[winnerIndices.length - 1];

      if (targetIndex === undefined) {
        return false;
      }

      const targetOffset =
        targetIndex * itemWidth - (viewportWidth / 2 - itemWidth / 2);

      if (randomIntervalRef.current) {
        clearInterval(randomIntervalRef.current);
      }
      if (randomTimeoutRef.current) {
        clearTimeout(randomTimeoutRef.current);
      }

      setRandomWinnerKey(winnerKey);
      setRandomHighlightReady(false);
      setRandomPickerItems(expanded);
      setShowRandomPicker(true);
      setRandomPickerTransition("none");
      setRandomPickerOffset(0);

      let quickOffset = 0;

      randomIntervalRef.current = setInterval(() => {
        quickOffset += itemWidth;
        setRandomPickerTransition("transform 110ms linear");
        setRandomPickerOffset(quickOffset);
      }, 110);

      randomTimeoutRef.current = setTimeout(() => {
        clearInterval(randomIntervalRef.current);
        setRandomPickerTransition(
          "transform 3000ms cubic-bezier(0.12, 0.8, 0.18, 1)"
        );
        setRandomPickerOffset(targetOffset);
      }, 1300);

      return true;
    };

    const handlePartySnapshot = (data) => {
      setParty(data);
      setIsHost(getEntityId(data.host) === String(currentUserId));
      setChatMessages(normalizeChatMessages(data.chatMessages));
    };

    const handleCategoryUpdate = (data) => {
      setParty((prev) => ({
        ...prev,
        ...data
      }));
    };

    const handleOptionsUpdate = (data) => {
      setParty((prev) => ({
        ...prev,
        ...data
      }));
    };

    const handleModeUpdate = (data) => {
      setParty((prev) => ({
        ...prev,
        selectionMode: data.selectionMode
      }));

      if (data.selectionMode !== "random") {
        setShowRandomPicker(false);
        setRandomHighlightReady(false);
        setWinnerRevealReady(true);
      }
    };

    const handleVotingFinalized = (data) => {
      setParty((prev) => ({
        ...prev,
        finalizedResult: data.finalizedResult
      }));
      setWinnerRevealReady(true);
      revealWinnerCardWithTimer();
    };

    const handleRandomFinalized = (data) => {
      setParty((prev) => ({
        ...prev,
        finalizedResult: data.finalizedResult
      }));

      if (winnerRevealTimeoutRef.current) {
        clearTimeout(winnerRevealTimeoutRef.current);
      }

      setWinnerRevealReady(false);
      const started = startRandomAnimation(data);

      if (!started) {
        setWinnerRevealReady(true);
        revealWinnerCardWithTimer();
        return;
      }

      winnerRevealTimeoutRef.current = setTimeout(() => {
        setRandomHighlightReady(true);
        setWinnerRevealReady(true);
        revealWinnerCardWithTimer();
      }, 4400);
    };

    const handleChatUpdated = (data) => {
      setChatMessages(normalizeChatMessages(data.chatMessages));
    };

    fetchParty();

    socket.on("partySnapshot", handlePartySnapshot);
    socket.on("categoryUpdated", handleCategoryUpdate);
    socket.on("optionsUpdated", handleOptionsUpdate);
    socket.on("modeUpdated", handleModeUpdate);
    socket.on("votingFinalized", handleVotingFinalized);
    socket.on("randomFinalized", handleRandomFinalized);
    socket.on("chatUpdated", handleChatUpdated);
    socket.on("connect", handleConnect);

    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    return () => {
      socket.off("partySnapshot", handlePartySnapshot);
      socket.off("categoryUpdated", handleCategoryUpdate);
      socket.off("optionsUpdated", handleOptionsUpdate);
      socket.off("modeUpdated", handleModeUpdate);
      socket.off("votingFinalized", handleVotingFinalized);
      socket.off("randomFinalized", handleRandomFinalized);
      socket.off("chatUpdated", handleChatUpdated);
      socket.off("connect", handleConnect);
      if (randomIntervalRef.current) {
        clearInterval(randomIntervalRef.current);
      }
      if (randomTimeoutRef.current) {
        clearTimeout(randomTimeoutRef.current);
      }
      if (winnerRevealTimeoutRef.current) {
        clearTimeout(winnerRevealTimeoutRef.current);
      }
      if (winnerCardTimeoutRef.current) {
        clearTimeout(winnerCardTimeoutRef.current);
      }
    };
  }, [partyCode, token, currentUserId]);

  if (!party) {
    return <h2>Loading...</h2>;
  }

  const activeOptions =
    party.currentCategory === "food" ? party.foodOptions : party.gameOptions;

  const allOptionsCount = party.foodOptions.length + party.gameOptions.length;
  const isModeLocked = Boolean(party.selectionMode);
  const isEditLocked = isModeLocked;
  const votingEnabled = party.selectionMode === "voting";

  const totalVotesByCurrentUser = activeOptions.reduce((count, option) => {
    return option.votes.some((vote) => getEntityId(vote) === String(currentUserId))
      ? count + 1
      : count;
  }, 0);

  const myOptions = activeOptions.filter(
    (option) => getEntityId(option.addedBy) === String(currentUserId)
  );

  const finalizedWinnerNames = Array.isArray(party.finalizedResult?.optionNames)
    ? party.finalizedResult.optionNames
    : party.finalizedResult?.optionName
      ? [party.finalizedResult.optionName]
      : [];

  const showWinnerCard =
    finalizedWinnerNames.length > 0 &&
    winnerRevealReady &&
    winnerCardVisible &&
    (party.finalizedResult?.category === party.currentCategory ||
      party.finalizedResult?.category === "all");

  const winnerCategory = party.finalizedResult?.category || party.currentCategory;
  const winnerIcon = CATEGORY_META[winnerCategory]?.icon || "bi bi-stars";

  const members = Array.isArray(party.members) ? party.members : [];

  const changeCategory = async (category) => {
    const res = await fetch(`http://localhost:5000/api/party/${partyCode}/category`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ category })
    });

    const data = await res.json();

    if (res.ok) {
      setParty(data);
      setErrorMsg("");
    } else {
      setErrorMsg(data.msg || "Error changing category");
    }
  };

  const addOption = async () => {
    if (!optionInput.trim()) {
      return;
    }

    const res = await fetch(`http://localhost:5000/api/party/${partyCode}/add-option`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name: optionInput })
    });

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
    const res = await fetch(`http://localhost:5000/api/party/${partyCode}/vote`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ optionName })
    });

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

  const sendChatMessage = () => {
    const message = chatInput.trim();
    if (!message) {
      return;
    }

    fetch(`http://localhost:5000/api/party/${partyCode}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ message })
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.msg || "Error sending message");
        }

        setChatMessages(normalizeChatMessages(data.chatMessages));
        setChatInput("");
      })
      .catch((err) => {
        setErrorMsg(err.message || "Error sending message");
      });
  };

  return (
    <div className="party-page">
      <div className="party-layout">
        <aside className="members-panel glass-card">
          <div className="panel-title">
            <i className="bi bi-people-fill"></i>
            <h3>Members</h3>
          </div>

          <div className="members-list">
            {members.map((member) => {
              const memberId = getEntityId(member);
              const memberIsHost = memberId === getEntityId(party.host);
              const isMe = memberId === String(currentUserId);

              return (
                <div key={memberId} className={`member-item ${memberIsHost ? "host" : ""}`}>
                  <div className="member-avatar">
                    {getEntityName(member).slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="member-name">
                      {getEntityName(member)} {isMe ? "(You)" : ""}
                    </p>
                    <p className="member-role">{memberIsHost ? "Host" : "Guest"}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="chat-panel">
            <div className="panel-title chat-title">
              <i className="bi bi-chat-dots"></i>
              <h3>Party Chat</h3>
            </div>
            <div className="chat-messages">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-msg ${String(msg.userId) === String(currentUserId) ? "me" : ""}`}
                >
                  <p className="chat-user">{msg.user}</p>
                  <p className="chat-text">{msg.text}</p>
                </div>
              ))}
            </div>
            <div className="chat-input-row">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    sendChatMessage();
                  }
                }}
                placeholder="Type message..."
              />
              <button className="chat-send" onClick={sendChatMessage}>
                <i className="bi bi-send-fill"></i>
              </button>
            </div>
          </div>
        </aside>

        <main className="party-main">
          <header className="party-topbar glass-card">
            <div>
              <p className="party-label">Party Code</p>
              <h1>{party.partyCode}</h1>
            </div>

            <div className="mode-block">
              <p className="party-label">Selection Mode</p>
              <div className="mode-value">{party.selectionMode || "Not selected"}</div>
              {isHost && (
                <div className="mode-controls">
                  <button
                    className="neon-button"
                    disabled={allOptionsCount === 0}
                    onClick={() => chooseSelectionMode("voting")}
                  >
                    <i className="bi bi-hand-index-thumb"></i>
                    Voting
                  </button>
                  <button
                    className="neon-button"
                    disabled={allOptionsCount === 0}
                    onClick={() => chooseSelectionMode("random")}
                  >
                    <i className="bi bi-shuffle"></i>
                    Random
                  </button>
                  <button
                    className="neon-button ghost"
                    onClick={() => chooseSelectionMode(null)}
                  >
                    <i className="bi bi-unlock"></i>
                    Unlock
                  </button>
                </div>
              )}
            </div>
          </header>

          <nav className={`category-nav glass-card ${!isHost ? "viewer" : ""}`}>
            {Object.entries(CATEGORY_META)
              .filter(([key]) => key !== "all")
              .map(([key, meta]) => {
                const selected = party.currentCategory === key;
                return (
                  <button
                    key={key}
                    className={`category-btn ${selected ? "active" : ""}`}
                    disabled={!isHost}
                    onClick={() => changeCategory(key)}
                  >
                    <i className={meta.icon}></i>
                    <span>{meta.label}</span>
                  </button>
                );
              })}
          </nav>

          {errorMsg && <p className="error-msg">{errorMsg}</p>}

          {party.currentCategory === "music" ? (
            <section className="music-state glass-card">
              <button
                className={`music-toggle ${discoMode ? "active" : ""}`}
                onClick={() => setDiscoMode((prev) => !prev)}
              >
                {discoMode ? "Chill" : "Disco"}
              </button>
              <div className={`music-stage ${discoMode ? "disco" : "chill"}`}>
                {discoMode && <div className="disco-lights"></div>}
                {discoMode && <div className="disco-hanger"></div>}
                <div className={`music-disc ${discoMode ? "disco-ball" : "cd"}`}>
                  <div className="disc-core"></div>
                </div>
                <h3>{discoMode ? "Disco Mode" : "Music Mode"}</h3>
                <p>
                  {discoMode
                    ? "RGB lights are on. Let the party glow."
                    : "Smooth rotating vinyl vibe."}
                </p>
              </div>
            </section>
          ) : (
            <section className={`option-lists-shell ${votingEnabled ? "voting-stage" : ""}`}>
              <div className={`editor-pane glass-card ${isEditLocked ? "locked" : ""}`}>
                <div className="panel-title">
                  <i className="bi bi-pencil-square"></i>
                  <h3>Your Options</h3>
                </div>

                <div className="add-option-row">
                  <input
                    type="text"
                    value={optionInput}
                    onChange={(e) => setOptionInput(e.target.value)}
                    placeholder="Type your option"
                    disabled={isEditLocked}
                  />
                  <button className="neon-button" onClick={addOption} disabled={isEditLocked}>
                    <i className="bi bi-plus-lg"></i>
                    Add
                  </button>
                </div>

                {isEditLocked && (
                  <p className="lock-msg">
                    <i className="bi bi-lock-fill"></i>
                    Editing is locked while mode is active.
                  </p>
                )}

                <div className="my-options-list">
                  {myOptions.length === 0 && (
                    <p className="empty-msg">No options added by you in this category.</p>
                  )}

                  {myOptions.map((option, index) => (
                    <div className="option-mini-row" key={`${option.name}-${index}`}>
                      <span>{option.name}</span>
                      <button
                        className="icon-btn"
                        disabled={isEditLocked}
                        onClick={() => deleteOption(option.name)}
                      >
                        <i className="bi bi-trash3"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="live-pane glass-card">
                <div className="live-pane-head">
                  <div className="panel-title">
                    <i className="bi bi-broadcast-pin"></i>
                    <h3>Live Options</h3>
                  </div>

                  {votingEnabled && (
                    <div className="vote-stage-banner">
                      <i className="bi bi-lightning-charge-fill"></i>
                      Voting stage active - pick up to 2 options
                    </div>
                  )}

                  {isHost && votingEnabled && (
                    <button className="neon-button accent" onClick={finalizeVoting}>
                      <i className="bi bi-trophy"></i>
                      Finalize Voting
                    </button>
                  )}
                </div>

                {showRandomPicker && party.selectionMode === "random" && (
                  <div className="random-picker-wrap">
                    <p className="random-title">Random Picker</p>
                    <div className="random-picker-track-shell">
                      <div className="random-picker-center-line" />
                      <div
                        className="random-picker-track"
                        style={{
                          transform: `translateX(${-randomPickerOffset}px)`,
                          transition: randomPickerTransition
                        }}
                      >
                        {randomPickerItems.map((item, index) => {
                          const key = `${item.category}:${item.name}`;
                          const isWinner = randomHighlightReady && key === randomWinnerKey;

                          return (
                            <div
                              key={`${key}-${index}`}
                              className={`random-picker-item ${isWinner ? "winner" : ""}`}
                            >
                              <span>{item.name}</span>
                              <small>{CATEGORY_META[item.category]?.label || item.category}</small>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className={`options-grid ${votingEnabled ? "voting-grid" : ""}`}>
                  {activeOptions.map((option, index) => {
                    const alreadyVoted = option.votes.some(
                      (vote) => getEntityId(vote) === String(currentUserId)
                    );

                    return (
                      <div className="option-card" key={`${option.name}-${index}`}>
                        <div>
                          <h4>{option.name}</h4>
                          <p>{option.votes.length} vote(s)</p>
                        </div>

                        {votingEnabled && (
                          <button
                            className={`neon-button vote-btn ${alreadyVoted ? "selected" : ""}`}
                            onClick={() => voteOption(option.name)}
                            disabled={!alreadyVoted && totalVotesByCurrentUser >= 2}
                          >
                            <i className={alreadyVoted ? "bi bi-check2-circle" : "bi bi-hand-index"}></i>
                            {alreadyVoted ? "Unvote" : "Vote"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {showWinnerCard && (
            <div className="winner-overlay">
              <div className="confetti-layer" aria-hidden="true">
                {CONFETTI_BITS.map((bit) => (
                  <span
                    key={bit.id}
                    className="confetti-piece"
                    style={{
                      left: bit.left,
                      animationDelay: bit.delay,
                      animationDuration: bit.duration,
                      transform: `rotate(${bit.rotate})`
                    }}
                  />
                ))}
              </div>
              <div className="winner-card">
                <i className={`winner-icon ${winnerIcon}`}></i>
                <p className="winner-label">Final Winner</p>
                <h2>{finalizedWinnerNames.join(" | ")}</h2>
                <p className="winner-votes">{party.finalizedResult.votes} vote(s)</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default PartyPage;
