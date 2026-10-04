import { useState } from "react";
import { FaArrowLeft, FaUserCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

function Identity() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");

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
            ></div>
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
              Ces informations nous aident à
              construire ton arbre familial.
            </p>
          </div>

        </div>

        <label>Nom complet</label>

        <input
          type="text"
          className="phone-input"
          placeholder="Ex : Koto Mvetch"
          value={fullName}
          onChange={(e) =>
            setFullName(e.target.value)
          }
        />

        <label>Date de naissance</label>

        <input
          type="date"
          className="phone-input"
          value={birthDate}
          onChange={(e) =>
            setBirthDate(e.target.value)
          }
        />

        <label>Genre</label>

        <div className="gender-container">

          <button
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

        <button
          className="continue-btn"
          onClick={() => navigate("/document")}
        >
          Continuer →
        </button>

      </div>
    </div>
  );
}

export default Identity;