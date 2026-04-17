import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const token = sessionStorage.getItem('warpaths_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
