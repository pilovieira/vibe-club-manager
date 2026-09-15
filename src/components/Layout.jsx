import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { useLanguage } from '../context/LanguageContext';
import { APP_NAME } from '../constants';

const Layout = () => {
  const { t } = useLanguage();
  return (
    <div className="layout">
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} {APP_NAME}. {t('footer.rights')}</p>
        </div>
      </footer>
      <style>{`
        .layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .main-content {
          flex: 1;
          padding: 2rem 0;
        }
        .footer {
          background-color: var(--bg-card);
          border-top: 1px solid var(--glass-border);
          padding: 2rem 0;
          text-align: center;
          color: var(--text-secondary);
          margin-top: auto;
        }
      `}</style>
    </div>
  );
};

export default Layout;
