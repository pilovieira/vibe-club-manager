import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useState } from 'react';
// import styles from './Navbar.module.css';

// We'll use inline styles or a simple CSS file for now to speed up, 
// ensuring we use the variables defined in index.css

const Navbar = () => {
  console.log('Navbar: rendering...');
  const { user, login, logout, isAdmin } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  console.log('Navbar: context data:', { hasUser: !!user, language, isAdmin });
  const navigate = useNavigate();
  const [showLangMenu, setShowLangMenu] = useState(false);

  const languages = [
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' }
  ];

  const currentLang = languages.find(l => l.code === language);

  const handleLogout = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log('Navbar: Logout initiated...');

    try {
      await logout();
      console.log('Navbar: Logout successful');
      navigate('/');
    } catch (err) {
      console.error('Navbar: Logout error', err);
      navigate('/');
    }
  };

  const displayName = user?.profile?.name || user?.user_metadata?.full_name || user?.email;
  const displayAvatar = user?.profile?.avatar || user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${displayName}&background=random`;

  return (
    <nav className="navbar">
      <div className="container nav-container">
        <Link to="/" className="nav-logo">
          <img src="/logo.jpg" alt={t('nav.logo')} className="logo-img" />
          <span className="logo-text">{t('nav.logo')}</span>
        </Link>

        <div className="nav-links">
          <Link to="/" className="nav-link">{t('nav.home')}</Link>
          <Link to="/members" className="nav-link">{t('nav.members')}</Link>
          <Link to="/events" className="nav-link">{t('nav.events')}</Link>
          <Link to="/about" className="nav-link">{t('nav.about')}</Link>
          <Link to="/contact" className="nav-link">{t('nav.contact')}</Link>
          {isAdmin && <Link to="/admin" className="nav-link admin-link">{t('nav.admin')}</Link>}
        </div>

        <div className="nav-auth">
          <div className="lang-selector">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="lang-toggle"
              onBlur={() => setTimeout(() => setShowLangMenu(false), 200)}
            >
              <span className="lang-flag">{currentLang?.flag || '🇧🇷'}</span>
              <span className="lang-name">{currentLang?.name || 'Português'}</span>
              <span className="lang-arrow">{showLangMenu ? '▲' : '▼'}</span>
            </button>
            {showLangMenu && (
              <div className="lang-menu">
                {languages.map(lang => (
                  <button
                    key={lang.code}
                    className={`lang-option ${language === lang.code ? 'active' : ''}`}
                    onClick={() => {
                      setLanguage(lang.code);
                      setShowLangMenu(false);
                    }}
                  >
                    <span className="lang-flag">{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {user ? (
            <div className="user-menu">
              <img src={displayAvatar} alt="avatar" className="nav-avatar" />
              <div className="user-info">
                <div className="user-name-row">
                  <Link to={`/members/${user.id}`} className="user-name-link">
                    <span className="user-name">{displayName}</span>
                  </Link>
                  {isAdmin && (
                    <span className="role-badge admin">Admin</span>
                  )}
                </div>
                <div className="user-actions-row">
                  <Link to={`/members/${user.id}`} state={{ edit: true }} className="btn-text edit-profile-btn">
                    {t('profile.editProfile')}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn-text logout-btn"
                  >
                    {t('nav.logout')}
                  </button>
                </div>

              </div>
            </div>
          ) : (
            <div className="auth-buttons">
              <button onClick={() => navigate('/login')} className="btn btn-primary">{t('nav.login')}</button>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .navbar {
          background-color: var(--bg-card);
          border-bottom: 1px solid var(--glass-border);
          padding: 1rem 0;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .nav-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .nav-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
        }
        .logo-img {
            height: 48px;
            width: 48px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid var(--accent);
        }
        .logo-text {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--primary);
        }
        .nav-links {
          display: flex;
          gap: 2rem;
        }
        .nav-link {
          color: var(--text-secondary);
          font-weight: 500;
          transition: color 0.2s;
        }
        .nav-link:hover, .nav-link.active {
          color: var(--text-primary);
        }
        .admin-link {
          color: var(--accent);
        }
        .nav-auth {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .lang-selector {
          position: relative;
        }
        .lang-toggle {
          background: var(--primary-glow);
          border: 1px solid var(--primary);
          color: var(--primary);
          padding: 0.5rem 0.8rem;
          border-radius: 0.375rem;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 140px;
        }
        .lang-toggle:hover {
          background: var(--primary-glow);
        }
        .lang-flag {
          font-size: 1.2rem;
        }
        .lang-name {
          flex: 1;
          text-align: left;
        }
        .lang-arrow {
          font-size: 0.7rem;
          opacity: 0.7;
        }
        .lang-menu {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 0;
          background: var(--bg-card);
          border: 1px solid var(--glass-border);
          border-radius: 0.5rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          z-index: 1000;
          min-width: 140px;
        }
        .lang-option {
          width: 100%;
          padding: 0.75rem 1rem;
          background: transparent;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: background 0.2s;
          text-align: left;
        }
        .lang-option:hover {
          background: var(--primary-glow);
        }
        .lang-option.active {
          background: var(--primary-glow);
          color: var(--primary);
          font-weight: 600;
        }
        .user-menu {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .nav-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid var(--primary);
        }
        .user-info {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }
        .user-name-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.1rem;
        }
        .user-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: inherit;
        }
        .user-name-link {
          text-decoration: none;
          color: var(--text-primary);
          transition: color 0.2s;
        }
        .user-name-link:hover {
          color: var(--primary);
        }
        .role-badge {
          font-size: 0.65rem;
          padding: 0.1rem 0.4rem;
          border-radius: 1rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .role-badge.admin {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .role-badge.member {
          background: var(--primary-glow);
          color: var(--primary);
          border: 1px solid var(--primary-semi);
        }
        .user-actions-row {
          display: flex;
          gap: 1rem;
          margin-top: 0.25rem;
        }
        .edit-profile-btn {
          text-decoration: none;
        }
        .btn-text {
          background: none;
          color: var(--text-secondary);
          font-size: 0.75rem;
          text-align: left;
          padding: 0;
        }
        .btn-text:hover {
          color: var(--danger);
        }
        .btn-outline {
            background: transparent;
            border: 1px solid var(--primary);
            color: var(--primary);
            padding: 0.4rem 0.8rem;
            border-radius: 0.375rem;
        }
        .btn-outline:hover {
            background: var(--primary-glow);
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
