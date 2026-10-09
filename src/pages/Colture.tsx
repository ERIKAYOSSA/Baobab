import { useContext, useState } from "react";
import {
  FaArrowLeft,
  FaGlobeAfrica,
  FaFlag,
  FaLanguage,
  FaUsers,
  FaMapMarkerAlt
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { SignupContext } from "../context/SignupContext";

function Colture() {
  const navigate = useNavigate();

  const { signupData, setSignupData } =
    useContext(SignupContext);

  const [nationality, setNationality] =
    useState("");

  const [language, setLanguage] =
    useState("");

  const [ethnicity, setEthnicity] =
    useState("");

  const [region, setRegion] =
    useState("");

  const [error, setError] =
    useState("");

  const handleContinue = () => {
    setError("");

    if (!nationality) {
      setError(
        "Veuillez sélectionner votre nationalité."
      );
      return;
    }

    setSignupData({
      ...signupData,
      nationalite: nationality,
      langue: language,
      ethnie: ethnicity,
      region: region,
    });

    navigate("/search-family");
  };

  return (
    <div className="phone-page">
      <div className="registration-card">

        <div className="progress-header">

          <button
            className="back-btn"
            onClick={() => navigate("/document")}
          >
            <FaArrowLeft />
          </button>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: "80%" }}
            />
          </div>

          <span className="step-number">
            4/5
          </span>

        </div>

        <div className="title-section">

          <div className="phone-icon">
            <FaGlobeAfrica />
          </div>

          <div>
            <h1>
              Identité culturelle
            </h1>

            <p>
              Ces informations nous aideront à
              retrouver des liens familiaux
              et préserver votre héritage.
            </p>
          </div>

        </div>

        <div className="culture-tip">
          🌳 Aidez Baobab à reconstruire vos
          racines familiales.
        </div>

        <div className="modern-field">

          <div className="field-icon">
            <FaFlag />
          </div>

          <div className="field-content">

            <label>
              Nationalité *
            </label>

            <select
              value={nationality}
              onChange={(e) =>
                setNationality(
                  e.target.value
                )
              }
            >
              <option value="">
                Choisir une nationalité
              </option>

              <option>
                🇨🇲 Cameroun
              </option>

              <option>
                🇨🇬 Congo
              </option>

              <option>
                🇬🇦 Gabon
              </option>

              <option>
                🇹🇩 Tchad
              </option>

              <option>
                🇨🇫 Centrafrique
              </option>

              <option>
                🇳🇬 Nigeria
              </option>

              <option>
                🇫🇷 France
              </option>

              <option>
                🇨🇦 Canada
              </option>

            </select>

          </div>

        </div>

        <div className="modern-field">

          <div className="field-icon">
            <FaLanguage />
          </div>

          <div className="field-content">

            <label>
              Langue principale
            </label>

            <select
              value={language}
              onChange={(e) =>
                setLanguage(
                  e.target.value
                )
              }
            >
              <option value="">
                Choisir une langue
              </option>

              <option>
                Français
              </option>

              <option>
                Anglais
              </option>

              <option>
                Ewondo
              </option>

              <option>
                Bassa
              </option>

              <option>
                Douala
              </option>

              <option>
                Fulfulde
              </option>

              <option>
                Lingala
              </option>

              <option>
                Swahili
              </option>

            </select>

          </div>

        </div>

        <div className="modern-field">

          <div className="field-icon">
            <FaUsers />
          </div>

          <div className="field-content">

            <label>
              Ethnie / Communauté
            </label>

            <select
              value={ethnicity}
              onChange={(e) =>
                setEthnicity(
                  e.target.value
                )
              }
            >
              <option value="">
                Choisir une communauté
              </option>

              <option>Beti</option>
              <option>Bassa</option>
              <option>Bamileke</option>
              <option>Douala</option>
              <option>Peul</option>
              <option>Fang</option>
              <option>Kongo</option>

            </select>

          </div>

        </div>

        <div className="modern-field">

          <div className="field-icon">
            <FaMapMarkerAlt />
          </div>

          <div className="field-content">

            <label>
              Région d'origine
            </label>

            <select
              value={region}
              onChange={(e) =>
                setRegion(
                  e.target.value
                )
              }
            >
              <option value="">
                Choisir une région
              </option>

              <option>Centre</option>
              <option>Littoral</option>
              <option>Ouest</option>
              <option>Sud</option>
              <option>Nord</option>
              <option>Est</option>
              <option>Adamaoua</option>
              <option>
                Extrême-Nord
              </option>

            </select>

          </div>

        </div>

        {error && (
          <p className="error-message">
            {error}
          </p>
        )}

        <button
          className="continue-btn"
          onClick={handleContinue}
        >
          Continuer →
        </button>

      </div>
    </div>
  );
}

export default Colture;