import "../App.css";
import { LuFingerprint } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

function Welcome() {
  const navigate = useNavigate();
  const [planting, setPlanting] = useState(false);
  const handleStart = () => {
  if (planting) return;

  setPlanting(true);

  setTimeout(() => {
    navigate("/telephone");
  }, 1500);
};

  return (
    <div className="welcome-page">
      <div className="background-glow"></div>

      <div className="logo-wrapper">
        <img src="./logo-baobab.jpg" alt="" height={35} width={210}/>
      </div>
      <h1 className="app-title">Baobab</h1>

      <p className="tagline">
        Ton arbre. Ta famille.
        <br />
        Ton héritage.
      </p>

      <div className="features">
        <div className="feature-card">
          <h3>Arbre</h3>
          <span>vivant</span>
        </div>

        <div className="feature-card">
          <h3>Liens</h3>
          <span>retrouvés</span>
        </div>

        <div className="feature-card">
          <h3>Culture</h3>
          <span>préservée</span>
        </div>
      </div>

      <button
  className={`start-btn ${planting ? "planting" : ""}`}
  onClick={handleStart}
>
  {!planting ? (
    <>
      <LuFingerprint className="fingerprint-icon" />
      <span>Commencer</span>
    </>
  ) : (
    <>
      <div className="mini-tree">
        <span className="trunk"></span>
        <span className="branch left-1"></span>
        <span className="branch right-1"></span>
        <span className="branch left-2"></span>
        <span className="branch right-2"></span>
      </div>

      <span>On plante votre arbre...</span>
    </>
  )}
</button>

      <button
        className="demo-btn"
        onClick={() => navigate("/demo")}
      >
        Voir la démo
      </button>

      <p
        className="login-link"
        onClick={() => navigate("/login")}
      >
        J'ai déjà un compte
      </p>

      <p className="languages">
        Disponible en Français · English · Kiswahili
      </p>
    </div>
  );
}

export default Welcome;