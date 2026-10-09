import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaTree } from "react-icons/fa";

function CreatingTree() {
  const navigate = useNavigate();

  const [progress, setProgress] =
    useState(0);

  const [message, setMessage] =
    useState(
      "Préparation de votre espace Baobab..."
    );

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 20;

        if (next === 20) {
          setMessage(
            "Analyse de votre profil familial..."
          );
        }

        if (next === 40) {
          setMessage(
            "Création de votre arbre généalogique..."
          );
        }

        if (next === 60) {
          setMessage(
            "Recherche de correspondances familiales..."
          );
        }

        if (next === 80) {
          setMessage(
            "Organisation de votre espace personnel..."
          );
        }

        if (next >= 100) {
          clearInterval(interval);

          setMessage(
            "Votre arbre est prêt 🎉"
          );

          setTimeout(() => {
            navigate("/dashboard");
          }, 1500);

          return 100;
        }

        return next;
      });
    }, 1000);

    return () =>
      clearInterval(interval);
  }, [navigate]);

  return (
    <div className="phone-page">

      <div className="registration-card">

        <div className="creating-tree-container">

          <div className="creating-tree-icon">
            <FaTree />
          </div>

          <h1 className="creating-tree-title">
            Création de votre arbre
          </h1>

          <p className="creating-tree-message">
            {message}
          </p>

          <div className="creating-tree-bar">

            <div
              className="creating-tree-fill"
              style={{
                width: `${progress}%`
              }}
            />

          </div>

          <div className="creating-tree-percent">
            {progress}%
          </div>

          <div className="creating-tree-status">
            🌳 Baobab prépare votre
            espace familial sécurisé.
          </div>

        </div>

      </div>

    </div>
  );
}

export default CreatingTree;