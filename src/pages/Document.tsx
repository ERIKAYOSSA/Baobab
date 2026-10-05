import { FaArrowLeft, FaIdCard } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  FaUpload,
  FaClock
} from "react-icons/fa";

function Document() {
  const navigate = useNavigate();

  const [documentUploaded] =
    useState(false);
    const [file, setFile] = useState<File | null>(null);


  const handleFileChange = (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const selected = e.target.files?.[0];

  if (!selected) return;

  setFile(selected);

  
};

  return (
    <div className="phone-page">
      <div className="registration-card">

        <div className="progress-header">
          <button
            className="back-btn"
            onClick={() => navigate("/identity")}
          >
            <FaArrowLeft />
          </button>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: "60%" }}
            />
          </div>

          <span className="step-number">
            3/5
          </span>
        </div>

        <div className="title-section">

          <div className="phone-icon">
            <FaIdCard />
          </div>

          <div>
            <h1>Pièce d'identité</h1>

            <p>
              Pour vérifier ton profil et
              renforcer la confiance dans
              l'arbre familial.
            </p>
          </div>

        </div>

        <label className="document-card">

  <FaUpload className="document-icon" />

  <div className="document-content">

    <h3>Téléverser ma pièce d'identité</h3>

    <span>
      CNI, Passeport ou Permis
    </span>

    <input
      type="file"
      hidden
      accept=".jpg,.jpeg,.png,.pdf"
      onChange={handleFileChange}
    />

  </div>

</label>
        <button
  className="later-card"
  onClick={() => navigate("/colture")}
>

  <FaClock className="document-icon" />

  <div className="document-content">

    <h3>Plus tard</h3>

    <span>
      Continuer sans document
    </span>

  </div>

</button>
{file && (
  <div className="preview-card">

    <h4>Document sélectionné</h4>

    <p>{file.name}</p>



    {file.type === "application/pdf" && (
      <div className="pdf-preview">
        📄 PDF sélectionné
      </div>
    )}

  </div>
)}
        <button
          className="continue-btn"
          onClick={() =>
            navigate("/colture")
          }
        >
          {documentUploaded
            ? "Continuer →"
            : "Ignorer →"}
        </button>

      </div>
    </div>
  );
}

export default Document;