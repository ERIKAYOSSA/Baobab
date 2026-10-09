import { useContext, useState } from "react";
import { FaArrowLeft, FaUserCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { SignupContext } from "../context/SignupContext";

function Identity() {
  const navigate = useNavigate();

  const { signupData, setSignupData } =
    useContext(SignupContext);

  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [error, setError] = useState("");

  const handleContinue = () => {
    setError("");

    if (!fullName.trim()) {
      setError(
        "Veuillez saisir votre nom complet."
      );
      return;
    }

    if (!birthDate) {
      setError(
        "Veuillez sélectionner votre date de naissance."
      );
      return;
    }

    if (!gender) {
      setError(
        "Veuillez sélectionner votre genre."
      );
      return;
    }

    setSignupData({
      ...signupData,
      nomComplet: fullName,
      dateNaissance: birthDate,
      genre: gender,
    });

    navigate("/document");
  };

  return (
    <div className="phone-page">
      <div className="registration-card">

        <div className="progress-header">

          <button
            className="back-btn"
            onClick={() => navigate("/telephone")}
          >
            <FaArrowLeft />
          </button>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: "40%" }}
            />
          </div>

          <span className="step-number">
            2/5
          </span>

        </div>

        <div className="title-section">

          <div className="phone-icon">
            <FaUserCircle />
          </div>

          <div>
            <h1>Qui es-tu ?</h1>

            <p>
              Ces informations nous aideront
              à construire ton arbre familial.
            </p>
          </div>

        </div>

        <label>
          Nom complet
        </label>

        <input
          type="text"
          className="phone-input"
          placeholder="Ex : Eric nem"
          value={fullName}
          onChange={(e) =>
            setFullName(e.target.value)
          }
        />

        <label>
          Date de naissance
        </label>

        <input
          type="date"
          className="phone-input"
          value={birthDate}
          onChange={(e) =>
            setBirthDate(e.target.value)
          }
        />

        <label>
          Genre
        </label>

        <div className="gender-container">

          <button
            type="button"
            className={
              gender === "Femme"
                ? "gender-btn active"
                : "gender-btn"
            }
            onClick={() =>
              setGender("Femme")
            }
          >
            Femme
          </button>

          <button
            type="button"
            className={
              gender === "Homme"
                ? "gender-btn active"
                : "gender-btn"
            }
            onClick={() =>
              setGender("Homme")
            }
          >
            Homme
          </button>

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

export default Identity;