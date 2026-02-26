import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

function PartyPage() {
  const { partyCode } = useParams();
  const [party, setParty] = useState(null);
  const [isHost, setIsHost] = useState(false);

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

  return (
    <div>
      <h1>Party Code: {party.partyCode}</h1>

      <div style={{ marginTop: "20px" }}>
        <button
          disabled={!isHost}
          onClick={() => changeCategory("food")}
        >
          Food
        </button>

        <button
          disabled={!isHost}
          onClick={() => changeCategory("games")}
        >
          Games
        </button>

        <button
          disabled={!isHost}
          onClick={() => changeCategory("music")}
        >
          Music
        </button>
      </div>

      <h2 style={{ marginTop: "30px" }}>
        Current Category: {party.currentCategory}
      </h2>

      {!isHost && <p>Waiting for host...</p>}
    </div>
  );
}

export default PartyPage;