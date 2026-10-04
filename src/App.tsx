import "./App.css";
import { LuFingerprint } from "react-icons/lu";
function App() {
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

      <button className="start-btn">
  <LuFingerprint className="fingerprint-icon" />
  <span>Commencer</span>
</button>
      <button className="demo-btn">
        Voir la démo
      </button>

      <p className="login-link">
        J'ai déjà un compte
      </p>

      <p className="languages">
        Disponible en Français · English · Kiswahili
      </p>

    </div>
  );
}

export default App;