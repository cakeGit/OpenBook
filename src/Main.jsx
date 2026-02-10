import { Route, Routes } from "react-router-dom";

import Home from "./pages/index/page.jsx";
import Error404 from "./pages/error404/page.jsx";
import GetAccount from "./pages/get_account/page.jsx";
import CreateAccount from "./pages/create_account/page.jsx";
import FlashcardSelect from "./pages/flashcard_select/page.jsx";
import FlashcardSession from "./pages/flashcard_session/page.jsx";
import FlashcardComplete from "./pages/flashcard_complete/page.jsx";
import Settings from "./pages/settings/page.jsx";

const Main = () => {
  return (
    <Routes>
      <Route index element={<Home/>}></Route>
      <Route path="/get_account" element={<GetAccount/>}></Route>
      <Route path="/create_account" element={<CreateAccount/>}></Route>
      <Route path="/flashcard_select" element={<FlashcardSelect/>}></Route>
      <Route path="/flashcard_session" element={<FlashcardSession/>}></Route>
      <Route path="/flashcard_complete" element={<FlashcardComplete/>}></Route>
      <Route path="/settings" element={<Settings/>}></Route>
      <Route path="*" element={<Error404/>}></Route>
    </Routes>
  );
}

export default Main;