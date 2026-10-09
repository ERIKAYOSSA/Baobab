import { useState } from "react";
import { FaArrowLeft, FaPhoneAlt, FaCheckCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { SignupContext } from "../context/SignupContext";

function Phone() {
  const navigate = useNavigate();

  const [phone, setPhone] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [error, setError] = useState("");
const [success, setSuccess] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { signupData, setSignupData } =
  useContext(SignupContext);

  const [otp, setOtp] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);

  const handleOtpChange = (
  value: string,
  index: number
) => {
  if (!/^\d*$/.test(value)) return;

  const newOtp = [...otp];
  newOtp[index] = value;
  setOtp(newOtp);

  if (value && index < 5) {
    const nextInput = document.getElementById(
      `otp-${index + 1}`
    ) as HTMLInputElement;

    nextInput?.focus();
  }

  const enteredCode = newOtp.join("");

  if (enteredCode === "123456") {
    setTimeout(() => {
      setPhoneVerified(true);
    }, 300);
  }
};
const handleKeyDown = (
  e: React.KeyboardEvent<HTMLInputElement>,
  index: number
) => {
  if (
    e.key === "Backspace" &&
    !otp[index] &&
    index > 0
  ) {
    const previousInput = document.getElementById(
      `otp-${index - 1}`
    ) as HTMLInputElement;

    previousInput?.focus();
  }
};
  const handleContinue = () => {

  setError("");

  if (!password.trim()) {
    setError("Veuillez entrer un mot de passe.");
    return;
  }

  if (!confirmPassword.trim()) {
    setError("Veuillez confirmer votre mot de passe.");
    return;
  }

  if (password.length < 6) {
    setError(
      "Le mot de passe doit contenir au moins 6 caractères."
    );
    return;
  }

  if (password !== confirmPassword) {
    setError(
      "Les mots de passe ne correspondent pas."
    );
    return;
  }

  setSuccess(true);
  setSignupData({
  ...signupData,
  telephone: phone,
  motDePasse: password,
});

  setTimeout(() => {
    navigate("/identity");
  }, 1000);
};
  return (
    <div className="phone-page">
      <div className="registration-card">

        <div className="progress-header">
          <button
            className="back-btn"
            onClick={() => navigate("/")}
          >
            <FaArrowLeft />
          </button>

          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>

          <span className="step-number">
            1/5
          </span>
        </div>

        <div className="title-section">
          <div className="phone-icon">
            <FaPhoneAlt />
          </div>

          <div>
            <h1>Ton numéro</h1>

            <p>
              On t'envoie un code par SMS
              pour créer et sécuriser ton compte.
            </p>
          </div>
        </div>

        <input
          type="tel"
          className="phone-input"
          placeholder="+237 6 XX XX XX XX"
          value={phone}
          onChange={(e) =>
            setPhone(e.target.value)
          }
        />

        {!codeSent && (
          <button
            className="continue-btn"
            onClick={() => setCodeSent(true)}
          >
            Recevoir le code
          </button>
        )}

        {codeSent && !phoneVerified && (
          <>
            <p className="otp-label">
              Code reçu par SMS
            </p>

            <div className="otp-boxes">
  {otp.map((digit, index) => (
    <input
      key={index}
      id={`otp-${index}`}
      type="text"
      maxLength={1}
      value={digit}
      onChange={(e) =>
        handleOtpChange(
          e.target.value,
          index
        )
      }
      onKeyDown={(e) =>
        handleKeyDown(e, index)
      }
    />
  ))}
</div>
            <p
              style={{
                textAlign: "center",
                color: "#999",
                marginTop: "-10px",
              }}
            >
              Code de test : 123456
            </p>
          </>
        )}

        {phoneVerified && (
          <div className="password-section">

            <div className="verified-message">
              <FaCheckCircle />
              <span>
                Numéro vérifié
              </span>
            </div>

            <h2>Crée ton mot de passe</h2>

            <input
              type="password"
              className="phone-input"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />

            <input
              type="password"
              className="phone-input"
              placeholder="Confirmer le mot de passe"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(
                  e.target.value
                )
              }
            />
            {error && (
  <p className="error-message">
    {error}
  </p>
)}
{success && (
  <p className="success-message">
    ✅ Informations sécurisées
  </p>
)}


            <button
              className="continue-btn"
              onClick={handleContinue}
            >
              Continuer →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default Phone;