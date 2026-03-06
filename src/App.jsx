import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Members from './pages/Members';
import MemberProfile from './pages/MemberProfile';
import AdminDashboard from './pages/AdminDashboard';
import AdminCreateMember from './pages/AdminCreateMember';
import AdminMemberContributions from './pages/AdminMemberContributions';

import AdminMonthlySummary from './pages/AdminMonthlySummary';
import AdminGlobalBalance from './pages/AdminGlobalBalance';
import AdminProperties from './pages/AdminProperties';
import AdminLogBook from './pages/AdminLogBook';
import Events from './pages/Events';
import EventGallery from './pages/EventGallery';
import Contact from './pages/Contact';
import About from './pages/About';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

import { useSettings } from './context/SettingsContext';
import { useEffect } from 'react';

function App() {
  const { settings, loading } = useSettings();

  useEffect(() => {
    document.title = settings.app_title;
  }, [settings.app_title]);

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

          {/* Member & Event Routes (Logged users only) */}
          <Route element={<ProtectedRoute />}>
            <Route path="members" element={<Members />} />
            <Route path="members/:id" element={<MemberProfile />} />
            <Route path="events" element={<Events />} />
            <Route path="events/:eventId/gallery" element={<EventGallery />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<ProtectedRoute adminOnly={true} />}>
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="admin/create-member" element={<AdminCreateMember />} />
            <Route path="admin/member-contributions" element={<AdminMemberContributions />} />
            <Route path="admin/summary" element={<AdminMonthlySummary />} />
            <Route path="admin/global-balance" element={<AdminGlobalBalance />} />
            <Route path="admin/properties" element={<AdminProperties />} />
            <Route path="admin/logbook" element={<AdminLogBook />} />
          </Route>


          <Route path="contact" element={<Contact />} />
          <Route path="about" element={<About />} />
          <Route path="login" element={<Login />} />

        </Route>
      </Routes>
    </Router>
  );
}


export default App;
