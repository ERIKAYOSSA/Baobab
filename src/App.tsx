import { BrowserRouter, Routes, Route } from "react-router-dom";

import Welcome from "./pages/Welcome";
import Phone from "./pages/Phone";
import Identity from "./pages/Identity";
import Document from "./pages/Document";
import Culture from "./pages/culture";
import SearchFamily from "./pages/SearchFamily";
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
          path="/culture"
          element={<Culture />}
        />
        <Route
          path="/search-family"
          element={<SearchFamily />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;