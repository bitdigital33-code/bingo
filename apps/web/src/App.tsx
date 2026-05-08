import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminDashboardPage } from './pages/admin-dashboard-page';
import { JoinRoomPage } from './pages/join-room-page';
import { LoginPage } from './pages/login-page';
import { PlayerRoomPage } from './pages/player-room-page';
import { TvRoomPage } from './pages/tv-room-page';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/app" element={<AdminDashboardPage />} />
      <Route path="/join/:roomCode" element={<JoinRoomPage />} />
      <Route path="/room/:roomCode/player" element={<PlayerRoomPage />} />
      <Route path="/room/:roomCode/tv" element={<TvRoomPage />} />
    </Routes>
  );
}
