import { createContext, useState } from "react";

export const SignupContext = createContext<any>(null);

export function SignupProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [signupData, setSignupData] = useState({
    telephone: "",
    motDePasse: "",
    nomComplet: "",
    dateNaissance: "",
    genre: "",
    nationalite: "",
    langue: "",
    ethnie: "",
    region: "",
  });

  return (
    <SignupContext.Provider
      value={{
        signupData,
        setSignupData,
      }}
    >
      {children}
    </SignupContext.Provider>
  );
}