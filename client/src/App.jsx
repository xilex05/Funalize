import { Routes, Route } from "react-router-dom";
import Login from "./Login";
import Signup from "./Signup";
import PrivateRoute from "./PrivateRoute";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route 
        path="/dashboard" 
        element={
          <PrivateRoute>
            <h1>Dashboard</h1>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = "/";
              }}
            >
              Logout
            </button>
          </PrivateRoute>
        } 
      />
    </Routes>
  );
}

export default App;
