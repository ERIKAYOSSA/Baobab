import { useContext, useState } from "react";
import {
  FaArrowLeft,
  FaSearch,
  FaCheckCircle
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { SignupContext } from "../context/SignupContext";

function SearchFamily() {
  const navigate = useNavigate();

  const { signupData, setSignupData } =
    useContext(SignupContext);

  const [hasRelative, setHasRelative] =
    useState<string>("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleFinish = async () => {
    try {
      setError("");
      setLoading(true);

      const finalData = {
        ...signupData,
        hasRelative:
          hasRelative === "yes",
      };
      console.log("FINAL DATA");
console.log(finalData);

      setSignupData(finalData);
      console.log("DONNEES ENVOYEES");
console.log(finalData);


      await axios.post(
        "http://localhost:5000/api/auth/register",
        finalData
      );

      navigate("/login");

    } catch (err) {
      console.error(err);

      setError(
        "Erreur lors de l'enregistrement."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="phone-page">
      <div className="registration-card">

        <div className="progress-header">

          <button
            className="back-btn"
            onClick={() =>
              navigate("/colture")
            }
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

        <div className="search-title-section">

          <div className="phone-icon">
            <FaSearch />
          </div>

          <div>
            <h1>
              Un proche est déjà sur Baobab ?
            </h1>

            <p>
              Nous pouvons connecter
              automatiquement vos arbres
              généalogiques si un membre
              de votre famille est déjà inscrit.
            </p>
          </div>

        </div>

        <div className="choice-container">

          <button
            type="button"
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
            type="button"
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
             Nous rechercherons
            automatiquement des membres
            pouvant correspondre à votre
            arbre familial.
          </div>
        )}

        {hasRelative === "no" && (
          <div className="culture-tip">
             Aucun problème. Vous pourrez
            construire votre arbre familial
            à partir de zéro.
          </div>
        )}

        <div className="culture-tip">
          🔒 Toutes les informations
          fournies durant l'inscription
          seront enregistrées de manière
          sécurisée dans Baobab.
        </div>

        {error && (
          <p className="error-message">
            {error}
          </p>
        )}

        <button
          className="continue-btn"
          onClick={handleFinish}
          disabled={loading}
        >
          <FaCheckCircle />

          <span>
            {loading
              ? "Création du profil..."
              : "Créer mon arbre"}
          </span>

        </button>

      </div>
    </div>
  );
}

export default SearchFamily;