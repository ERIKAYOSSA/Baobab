import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FaUserPlus,
  FaArrowLeft
} from "react-icons/fa";

import "../styles/AjoutProche.css";

function AjouterProche() {

  const navigate =
    useNavigate();

  const user =
    JSON.parse(
      localStorage.getItem(
        "user"
      ) || "{}"
    );

  const [nomComplet,
    setNomComplet] =
    useState("");

  const [dateNaissance,
    setDateNaissance] =
    useState("");

  const [paysOrigine,
    setPaysOrigine] =
    useState("");

  const [ethnie,
    setEthnie] =
    useState("");

  const [relation,
    setRelation] =
    useState("");

  const [loading,
    setLoading] =
    useState(false);

  const handleSubmit =
    async (
      e: React.FormEvent
    ) => {

      e.preventDefault();

      try {

        setLoading(true);

        const response =
          await fetch(
            "http://localhost:5000/api/relatives/add",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  userId:
                    user.id,

                  nomComplet,

                  dateNaissance,

                  paysOrigine,

                  ethnie,

                  relation
                })
            }
          );

        const data =
          await response.json();

        if (
          response.ok
        ) {

          alert(
            "Membre ajouté avec succès ✅"
          );

          navigate(
            "/dashboard"
          );

        } else {

          alert(
            data.message ||
              "Erreur lors de l'ajout"
          );

        }

      } catch (error) {

        console.error(
          error
        );

        alert(
          "Erreur serveur"
        );

      } finally {

        setLoading(false);

      }

    };

  return (

    <div className="add-relative-page">

      <div className="add-relative-card">

        <button
          className="back-btn"
          onClick={() =>
            navigate(-1)
          }
        >

          <FaArrowLeft />

        </button>

        <div className="page-header">

          <FaUserPlus />

          <h1>
            Ajouter un proche
          </h1>

          <p>
            Enrichis ton arbre
            généalogique
          </p>

        </div>

        <form
          onSubmit={
            handleSubmit
          }
        >

          <input
            type="text"
            placeholder="Nom complet"
            value={nomComplet}
            onChange={(e) =>
              setNomComplet(
                e.target.value
              )
            }
            required
          />

          <input
            type="date"
            value={
              dateNaissance
            }
            onChange={(e) =>
              setDateNaissance(
                e.target.value
              )
            }
          />

          <input
            type="text"
            placeholder="Pays d'origine"
            value={
              paysOrigine
            }
            onChange={(e) =>
              setPaysOrigine(
                e.target.value
              )
            }
          />

          <input
            type="text"
            placeholder="Ethnie"
            value={ethnie}
            onChange={(e) =>
              setEthnie(
                e.target.value
              )
            }
          />

          <select
            value={
              relation
            }
            onChange={(e) =>
              setRelation(
                e.target.value
              )
            }
            required
          >

            <option value="">
              Sélectionner une relation
            </option>

            <option value="PERE">
              Père
            </option>

            <option value="MERE">
              Mère
            </option>

            <option value="FRERE">
              Frère
            </option>

            <option value="SOEUR">
              Sœur
            </option>

            <option value="ENFANT">
              Enfant
            </option>

            <option value="GRAND_PERE">
              Grand-père
            </option>

            <option value="GRAND_MERE">
              Grand-mère
            </option>

          </select>

          <button
            type="submit"
            className="submit-btn"
            disabled={
              loading
            }
          >

            {
              loading
                ? "Ajout..."
                : "Ajouter à mon arbre"
            }

          </button>

        </form>

      </div>

    </div>

  );

}

export default AjouterProche;