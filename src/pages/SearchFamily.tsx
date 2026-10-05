import { useState } from "react";
import {
  FaArrowLeft,
  FaSearch,
  FaCheckCircle
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

function SearchFamily() {
  const navigate = useNavigate();

  const [hasRelative, setHasRelative] =
    useState<string>("");

  const handleFinish = () => {
    navigate("/dashboard");
  };

  return (
    <div className="phone-page">
      <div className="registration-card">

        <div className="progress-header">

          <button
            className="back-btn"
            onClick={() => navigate("/colture")}
          >
            <FaArrowLeft />
          </button>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: "100%" }}
            />
          </div>

          <span className="step-number">
            5/5
          </span>

        </div>

        <div className="title-section">

          <div className="phone-icon">
            <FaSearch />
          </div>

          <div>
            <h1>
              Un proche est déjà sur Baobab ?
            </h1>

            <p>
              Nous pouvons connecter
              automatiquement vos arbres.
            </p>
          </div>

        </div>

        <div className="choice-container">

          <button
            className={
              hasRelative === "yes"
                ? "choice-btn active"
                : "choice-btn"
            }
            onClick={() =>
              setHasRelative("yes")
            }
          >
            Oui
          </button>

          <button
            className={
              hasRelative === "no"
                ? "choice-btn active"
                : "choice-btn"
            }
            onClick={() =>
              setHasRelative("no")
            }
          >
            Non
          </button>

        </div>

        {hasRelative === "yes" && (
          <div className="culture-tip">
             Nous rechercherons automatiquement
            les membres correspondants une fois
            votre inscription terminée.
          </div>
        )}

        {hasRelative === "no" && (
          <div className="culture-tip">
             Aucun problème. Vous pourrez créer
            votre arbre à partir de zéro.
          </div>
        )}

        <button
          className="continue-btn"
          onClick={handleFinish}
        >
          <FaCheckCircle />
          <span>Créer mon arbre</span>
        </button>

      </div>
    </div>
  );
}

export default SearchFamily;