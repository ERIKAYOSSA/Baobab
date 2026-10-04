import "./App.css";

function App() {
  return (
    <div className="welcome-container">
      <div className="language-selector">
        <button>🇫🇷 Français</button>
        <button>🇬🇧 English</button>
        <button>🇹🇿 Kiswahili</button>
      </div>

      <div className="welcome-content">
        <h1 className="logo">🌳 BAOBAB</h1>

        <h2>
          Ton arbre.
          <br />
          Ta famille.
          <br />
          Ton héritage.
        </h2>

        <p className="subtitle">
          Le premier réseau mémoriel permettant de préserver et transmettre
          l'histoire de votre famille à travers les générations.
        </p>

        <div className="buttons">
          <button className="primary-btn">
            Commencer
          </button>

          <button className="secondary-btn">
            Voir la démo
          </button>
        </div>

        <p className="login-link">
          J'ai déjà un compte
        </p>
      </div>
    </div>
  );
}

export default App;