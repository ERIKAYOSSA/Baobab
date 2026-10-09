import { useState } from "react";
import BottomNav from "../components/BottomNav";
import "../styles/Discover.css";

interface MatchPerson {
  id: string;
  nomComplet: string;
  pays?: string;
  region?: string;
  ethnie?: string;
  score?: number;
}

export default function Discover() {

  const [nom, setNom] = useState("");
  const [pays, setPays] = useState("");
  const [ethnie, setEthnie] = useState("");

  const [results, setResults] =
    useState<MatchPerson[]>([]);
    const [
  selectedPerson,
  setSelectedPerson
] = useState<any>(null);
const sendRequest =
async (
  receiverId: string
) => {

  const user =
    JSON.parse(
      localStorage.getItem(
        "user"
      ) || "{}"
    );

  try {

    await fetch(

      "http://localhost:5000/api/relations/request",

      {

        method: "POST",

        headers: {

          "Content-Type":
            "application/json"

        },

        body:
          JSON.stringify({

            senderId:
              user.id,

            receiverId

          })

      }

    );

    alert(
      "Demande envoyée ✅"
    );

  } catch (
    error
  ) {

    console.error(
      error
    );

  }

};

  const handleSearch = async () => {

    try {

      const response =
        await fetch(
          "http://localhost:5000/api/discover/search",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              nom,
              pays,
              ethnie
            })
          }
        );

      const data =
        await response.json();

      setResults(data);

    } catch (error) {

      console.error(
        "Erreur recherche :",
        error
      );

    }

  };

  return (

    <div className="discover-page">

      <div className="discover-container">

        <span className="discover-label">
          DÉCOUVRIR
        </span>

        <h1 className="discover-title">
          Retrouve ta famille
        </h1>

        <div className="search-form">

          <div className="input-line">

            <span>
              👤
            </span>

            <input
              type="text"
              placeholder="Nom complet de la personne"
              value={nom}
              onChange={(e) =>
                setNom(
                  e.target.value
                )
              }
            />

          </div>

          <div className="input-line">

            <span>
              🌍
            </span>

            <input
              type="text"
              placeholder="Pays d'origine"
              value={pays}
              onChange={(e) =>
                setPays(
                  e.target.value
                )
              }
            />

          </div>

          <div className="input-line">

            <span>
              🏛️
            </span>

            <input
              type="text"
              placeholder="Ethnie ou région"
              value={ethnie}
              onChange={(e) =>
                setEthnie(
                  e.target.value
                )
              }
            />

          </div>

          <button
            className="search-btn"
            onClick={handleSearch}
          >

            🔍 Rechercher

          </button>

        </div>

        <div className="filters">

          <button className="active">
            Tous
          </button>

          <button>
            Bamiléké
          </button>

          <button>
            Ekang
          </button>

          <button>
            Bassa
          </button>

          <button>
            Cameroun
          </button>

          <button>
            Nigeria
          </button>

        </div>

        <div className="results-card">

          <h2>
            Liens potentiels détectés
          </h2>

          <span>
            {results.length}
            {" "}
            correspondance(s)
          </span>

          <div className="results-grid">

            {results.map(
              (person) => (

                <div
                  key={person.id}
                  className="match-card"
                >

                  <div className="avatar">

                    {
                      person.nomComplet
                        ?.split(" ")
                        .map(
                          (n) => n[0]
                        )
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    }

                  </div>

                  <h3>
                    {
                      person.nomComplet
                    }
                  </h3>

                  <p>
                    🌍 {
                      person.pays ||
                      "Non renseigné"
                    }
                  </p>

                  <p>
                    📍 {
                      person.region ||
                      "Non renseignée"
                    }
                  </p>

                  <p>
                    👥 {
                      person.ethnie ||
                      "Non renseignée"
                    }
                  </p>

                  <div className="compatibility">

                    Compatibilité :

                    {" "}

                    {
                      person.score || 0
                    }
                    %

                  </div>

                  <div className="reasons">

                    <p>
                      ✓ Même ethnie
                    </p>

                    <p>
                      ✓ Même région
                    </p>

                    <p>
                      ✓ Même patronyme
                    </p>

                  </div>

                  <div className="card-actions">

                    <button
                      onClick={() =>
                        setSelectedPerson(
                          person
                        )
                      }
                    >
                      Voir
                    </button>

                    <button

 onClick={() =>

  sendRequest(
   person.id
  )

 }

>

 Ajouter

</button>

                  </div>

                </div>

              )
            )}

          </div>

        </div>

      </div>
      {
selectedPerson && (

<div className="person-detail">

  <div className="detail-header">

    <div className="detail-avatar">

      {
        selectedPerson.nomComplet
          ?.split(" ")
          .map(
            (n:string) => n[0]
          )
          .join("")
          .slice(0,2)
      }

    </div>

    <div>

      <div className="detail-name">

        {
          selectedPerson.nomComplet
        }

      </div>

      <div className="detail-subtitle">

        Profil familial potentiel

      </div>

    </div>

  </div>

  <div className="detail-info">

    <p>
      🌍 Pays :
      {" "}
      {
        selectedPerson.pays
      }
    </p>

    <p>
      📍 Région :
      {" "}
      {
        selectedPerson.region
      }
    </p>

    <p>
      👥 Ethnie :
      {" "}
      {
        selectedPerson.ethnie
      }
    </p>

  </div>

  <div className="score-card">

    <div className="score-title">

      Compatibilité

    </div>

    <div className="score-badge">

      {
        selectedPerson.score
      }%

    </div>

    <div className="reason-list">

      <p>
        ✓ Même ethnie
      </p>

      <p>
        ✓ Même région
      </p>

      <p>
        ✓ Même patronyme
      </p>

    </div>

  </div>

  <div className="detail-actions">

    <button
      onClick={() =>
        setSelectedPerson(
          null
        )
      }
    >

      Fermer

    </button>

    <button
      className="detail-add"

      onClick={
        () =>
        sendRequest(
          selectedPerson.id
        )
      }

    >
      Ajouter
    </button>

  </div>

</div>

)}

      <BottomNav />

    </div>

  );

}