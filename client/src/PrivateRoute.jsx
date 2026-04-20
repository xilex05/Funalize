import { Navigate } from "react-router-dom";

// This wrapper protects pages that should only be accessible
// after the user has logged in and has a token in localStorage.
function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" />;
  }

  return children;
}

export default PrivateRoute;
