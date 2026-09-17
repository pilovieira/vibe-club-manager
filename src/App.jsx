import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Members from './pages/Members';
import MemberProfile from './pages/MemberProfile';
import AdminDashboard from './pages/AdminDashboard';
import AdminCreateMember from './pages/AdminCreateMember';
import AdminMemberContributions from './pages/AdminMemberContributions';

import AdminReports from './pages/AdminReports';
import AdminAnnualDues from './pages/AdminAnnualDues';
import AdminGlobalBalance from './pages/AdminGlobalBalance';
import AdminProperties from './pages/AdminProperties';
import AdminLogBook from './pages/AdminLogBook';
import AdminCustomPages from './pages/AdminCustomPages';
import Preferences from './pages/Preferences';
import Events from './pages/Events';
import EventGallery from './pages/EventGallery';
import CustomPage from './pages/CustomPage';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

import { useSettings } from './context/SettingsContext';

function App() {
  const { loading } = useSettings();

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a1a',
        color: '#fff',
        fontSize: '1.2rem',
        fontFamily: 'sans-serif'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />

          {/* Public & Member Routes */}
          <Route path="events" element={<Events />} />
          <Route path="events/:eventId/gallery" element={<EventGallery />} />
          <Route path="preferences" element={<Preferences />} />

          {/* Member & Event Routes (Logged users only) */}
          <Route element={<ProtectedRoute />}>
            <Route path="members" element={<Members />} />
            <Route path="members/:id" element={<MemberProfile />} />
          </Route>

          {/* Dashboard + Financial Routes (financeiro, admin or superuser) */}
          <Route element={<ProtectedRoute financeOnly={true} />}>
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="admin/member-contributions" element={<AdminMemberContributions />} />
            <Route path="admin/reports" element={<AdminReports />} />
            <Route path="admin/annual-dues" element={<AdminAnnualDues />} />
            <Route path="admin/global-balance" element={<AdminGlobalBalance />} />
          </Route>

          {/* Admin Routes (admin or superuser) */}
          <Route element={<ProtectedRoute adminOnly={true} />}>
            <Route path="admin/create-member" element={<AdminCreateMember />} />
            <Route path="admin/logbook" element={<AdminLogBook />} />
          </Route>

          {/* Superuser-only Routes */}
          <Route element={<ProtectedRoute superuserOnly={true} />}>
            <Route path="admin/properties" element={<AdminProperties />} />
            <Route path="admin/custom-pages" element={<AdminCustomPages />} />
          </Route>


          <Route path="pages/:path" element={<CustomPage />} />
          <Route path="login" element={<Login />} />

        </Route>
      </Routes>
    </Router>
  );
}


export default App;
