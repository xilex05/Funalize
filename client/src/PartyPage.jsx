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

  return (
    <div>
      <h1>Party Code: {party.partyCode}</h1>
      <p>Members: {party.members.length}</p>
      {isHost && <p>You are the Host</p>}
    </div>
  );
}

export default PartyPage;