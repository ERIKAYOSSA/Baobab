import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaEye, FaEyeSlash } from "react-icons/fa";

function Login() {
  const navigate = useNavigate();

  const [telephone, setTelephone] =
    useState("");

  const [motDePasse, setMotDePasse] =
    useState("");

  const [error, setError] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const handleLogin = async () => {
    try {
      setError("");

      const response =
        await axios.post(
          "http://localhost:5000/api/auth/login",
          {
            telephone,
            motDePasse,
          }
        );

      if (response.data.success) {

        localStorage.setItem(
          "user",
          JSON.stringify(
            response.data.utilisateur
          )
        );

        navigate("/creating-tree");
      }

    } catch {
      setError(
        "Téléphone ou mot de passe incorrect."
      );
    }
  };

  return (
    <div className="phone-page">
      <div className="registration-card">

        <h1>Connexion</h1>

        <input
          className="phone-input"
          placeholder="Téléphone"
          value={telephone}
          onChange={(e) =>
            setTelephone(
              e.target.value
            )
          }
        />

        <div className="password-wrapper">

          <input
            type={
              showPassword
                ? "text"
                : "password"
            }
            className="phone-input"
            placeholder="Mot de passe"
            value={motDePasse}
            onChange={(e) =>
              setMotDePasse(
                e.target.value
              )
            }
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword(
                !showPassword
              )
            }
          >
            {showPassword ? (
              <FaEyeSlash />
            ) : (
              <FaEye />
            )}
          </button>

        </div>

        {error && (
          <p className="error-message">
            {error}
          </p>
        )}

        <button
          className="continue-btn"
          onClick={handleLogin}
        >
          Se connecter
        </button>

      </div>
    </div>
  );
}

export default Login;
