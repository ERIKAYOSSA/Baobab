import { BrowserRouter, Routes, Route } from "react-router-dom";

import Welcome from "./pages/Welcome";
import Phone from "./pages/Phone";
import Identity from "./pages/Identity";
import Document from "./pages/Document";
import SearchFamily from "./pages/SearchFamily";
import Colture from "./pages/Colture";
import Login from "./pages/Login";
import CreatingTree from "./pages/CreatingTree";
import Dashboard from "./pages/Dashboard";
import Discover from "./pages/Discover";
import AjoutProche from "./pages/AjoutProche";


function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={<Welcome />}
        />

        <Route
          path="/telephone"
          element={<Phone />}
        />
        <Route
          path="/identity"
          element={<Identity />}
        />
        <Route
          path="/document"
          element={<Document />}
        />
        <Route
          path="/search-family"
          element={<SearchFamily />}
        />
        <Route
          path="/colture"
          element={<Colture />}
        />
        <Route
          path="/login"
          element={<Login />}
        />
        <Route
          path="/creating-tree"
          element={<CreatingTree />}
        />
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />
        <Route
          path="/discover"
          element={<Discover />}
        />
        <Route
          path="/ajouter-proche"
          element={<AjoutProche />}
        />



      </Routes>
    </BrowserRouter>
  );
}

export default App;