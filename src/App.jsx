import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import GamePage from './pages/GamePage';
import ExtractionPage from './pages/ExtractionPage';
import OrgManagementPage from './pages/OrgManagementPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AccountPage from './pages/AccountPage';
import AuthoringPage from './pages/AuthoringPage';
import ProtectedRoute from './components/layout/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/join" element={<SignupPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/game/:gameId" element={
            <ProtectedRoute><GamePage /></ProtectedRoute>
          } />
          <Route path="/extract" element={
            <ProtectedRoute><ExtractionPage /></ProtectedRoute>
          } />
          <Route path="/extract/:id" element={<ExtractionPage />} />
          <Route path="/org" element={
            <ProtectedRoute><OrgManagementPage /></ProtectedRoute>
          } />
          <Route path="/account" element={
            <ProtectedRoute><AccountPage /></ProtectedRoute>
          } />
          <Route path="/author" element={
            <ProtectedRoute><AuthoringPage /></ProtectedRoute>
          } />
          <Route path="/author/new" element={
            <ProtectedRoute><AuthoringPage /></ProtectedRoute>
          } />
          <Route path="/author/:scenario_id" element={
            <ProtectedRoute><AuthoringPage /></ProtectedRoute>
          } />
          <Route path="/" element={<Navigate to="/leaderboard" replace />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
