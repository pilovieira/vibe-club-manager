import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Members from './pages/Members';
import MemberProfile from './pages/MemberProfile';
import AdminDashboard from './pages/AdminDashboard';
import AdminMemberContributions from './pages/AdminMemberContributions';
import AdminMonthlySummary from './pages/AdminMonthlySummary';
import AdminGlobalBalance from './pages/AdminGlobalBalance';
import Events from './pages/Events';
import AboutUs from './pages/AboutUs';
import Contact from './pages/Contact';
import Login from './pages/Login';
// import Admin from './pages/Admin';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />

          <Route path="members" element={<Members />} />
          <Route path="members/:id" element={<MemberProfile />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/member-contributions" element={<AdminMemberContributions />} />
          <Route path="admin/summary" element={<AdminMonthlySummary />} />
          <Route path="admin/global-balance" element={<AdminGlobalBalance />} />
          <Route path="events" element={<Events />} />
          <Route path="about" element={<AboutUs />} />
          <Route path="contact" element={<Contact />} />
          <Route path="login" element={<Login />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
