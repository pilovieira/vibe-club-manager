import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { useState } from 'react';
import GenericLogo from './GenericLogo';
import { FaGlobe, FaChevronDown } from 'react-icons/fa';

const Navbar = () => {
  const { user, login, logout, isAdmin } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Close menus when navigation happens
  const handleNavClick = () => {
    setShowMobileMenu(false);
    setShowLangMenu(false);
  };

  const languages = [
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' }
  ];

  const currentLang = languages.find(l => l.code === language);

  const handleLogout = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      await logout();
      navigate('/');
      setShowMobileMenu(false);
    } catch (err) {
      console.error('Navbar: Logout error', err);
      navigate('/');
    }
  };

  const displayName = user?.profile?.name || user?.user_metadata?.full_name || user?.email;
  const displayAvatar = user?.profile?.avatar || user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${displayName}&background=random`;

  return (
    <nav className={`navbar ${showMobileMenu ? 'mobile-menu-open' : ''}`}>
      <div className="container nav-container">
        <Link to="/" className="nav-logo" onClick={handleNavClick}>
          {settings.app_logo ? (
            <img src={settings.app_logo} alt={settings.app_title} className="logo-img" />
          ) : (
            <GenericLogo />
          )}
          <span className="logo-text desktop-only">{settings.app_title}</span>
        </Link>

        {/* Hamburger Menu Icon */}
        <button
          className={`hamburger ${showMobileMenu ? 'active' : ''}`}
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          aria-label="Toggle Menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`nav-content ${showMobileMenu ? 'show' : ''}`}>
          <div className="nav-links">
            <Link to="/" className="nav-link" onClick={handleNavClick}>{t('nav.home')}</Link>
            <Link to="/about" className="nav-link" onClick={handleNavClick}>{t('nav.about')}</Link>
            <Link to="/members" className="nav-link" onClick={handleNavClick}>{t('nav.members')}</Link>
            <Link to="/events" className="nav-link" onClick={handleNavClick}>{t('nav.events')}</Link>
            <Link to="/contact" className="nav-link" onClick={handleNavClick}>{t('nav.contact')}</Link>
            {isAdmin && <Link to="/admin" className="nav-link admin-link" onClick={handleNavClick}>{t('nav.admin')}</Link>}
          </div>

          <div className="nav-auth-wrapper">
            <div className="lang-selector">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className={`lang-toggle ${showLangMenu ? 'active' : ''}`}
                onBlur={() => setTimeout(() => setShowLangMenu(false), 200)}
              >
                <FaGlobe className="globe-icon" />
                <span className="lang-flag">{currentLang?.flag}</span>
                <span className="lang-name">{currentLang?.code.toUpperCase()}</span>
                <FaChevronDown className={`arrow-icon ${showLangMenu ? 'up' : ''}`} />
              </button>
              {showLangMenu && (
                <div className="lang-menu animate-slide-up">
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      className={`lang-option ${language === lang.code ? 'selected' : ''}`}
                      onClick={() => {
                        setLanguage(lang.code);
                        setShowLangMenu(false);
                      }}
                    >
                      <span className="lang-flag">{lang.flag}</span>
                      <span className="lang-label">{lang.name}</span>
                      {language === lang.code && <span className="active-dot"></span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {user ? (
              <div className="user-section">
                <div className="user-profile-summary">
                  <img src={displayAvatar} alt="avatar" className="nav-avatar" />
                  <div className="user-text">
                    <Link to={`/members/${user.id}`} className="user-name-link" onClick={handleNavClick}>
                      <span className="user-name">{displayName}</span>
                    </Link>
                  </div>
                </div>
                <div className="user-actions">
                  <button type="button" onClick={handleLogout} className="nav-action-btn logout">
                    {t('nav.logout')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="auth-buttons">
                <button onClick={() => { navigate('/login'); handleNavClick(); }} className="btn btn-primary">{t('nav.login')}</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .navbar {
          background-color: var(--bg-card);
          border-bottom: 1px solid var(--glass-border);
          padding: 0.75rem 0;
          position: sticky;
          top: 0;
          z-index: 1000;
          transition: all 0.3s ease;
        }
        
        .nav-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 64px;
        }
        
        .nav-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
          z-index: 1100;
        }
        
        .logo-img {
          height: 44px;
          width: 44px;
          border-radius: 12px;
          object-fit: cover;
          border: 2px solid var(--accent);
          transition: transform 0.3s ease;
        }
        
        .generic-logo {
          height: 44px;
          width: 44px;
          border-radius: 12px;
          border: 2px solid var(--accent);
          background: var(--bg-card);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
          transition: transform 0.3s ease;
        }
        
        .nav-logo:hover .logo-img,
        .nav-logo:hover .generic-logo {
          transform: rotate(10deg) scale(1.05);
        }
        
        .logo-text {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--text-primary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        /* Desktop Content Layout */
        .nav-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex: 1;
          margin-left: 2rem;
        }
        
        .nav-links {
          display: flex;
          gap: 1.5rem;
          align-items: center;
        }
        
        .nav-link {
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.95rem;
          transition: all 0.2s ease;
          position: relative;
          padding: 0.5rem 0;
        }
        
        .nav-link:hover {
          color: var(--accent);
        }
        
        .nav-auth-wrapper {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        
        .lang-selector {
          position: relative;
        }

        .lang-selector {
          position: relative;
        }
        
        .lang-toggle {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--glass-border);
          color: var(--text-primary);
          padding: 0.5rem 0.85rem;
          border-radius: 2rem;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          font-weight: 700;
        }
        
        .lang-toggle:hover, .lang-toggle.active {
          background: rgba(255, 255, 255, 0.1);
          border-color: var(--accent);
          box-shadow: 0 0 15px var(--primary-shadow);
        }

        .globe-icon {
          color: var(--accent);
          font-size: 0.9rem;
          opacity: 0.8;
        }

        .arrow-icon {
          font-size: 0.7rem;
          transition: transform 0.3s ease;
          opacity: 0.6;
        }

        .arrow-icon.up {
          transform: rotate(180deg);
        }

        .lang-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 0.75rem;
          background: var(--bg-card);
          border: 1px solid var(--glass-border);
          border-radius: 1rem;
          overflow: hidden;
          min-width: 160px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          backdrop-filter: blur(10px);
          z-index: 1000;
        }

        .lang-option {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 600;
          font-size: 0.9rem;
          text-align: left;
        }

        .lang-option:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--accent);
        }

        .lang-option.selected {
          background: rgba(166, 123, 91, 0.1);
          color: var(--text-primary);
        }

        .active-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          margin-left: auto;
          box-shadow: 0 0 5px var(--accent);
        }

        .animate-slide-up {
          animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .user-section {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.25rem;
          border-radius: 2rem;
        }
        
        .user-profile-summary {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .nav-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 2px solid var(--accent);
          background: var(--bg-dark);
        }
        
        .user-name {
          font-size: 0.9rem;
          font-weight: 700;
          white-space: nowrap;
        }
        
        .role-tag {
          font-size: 0.65rem;
          padding: 0.1rem 0.4rem;
          border-radius: 0.25rem;
          margin-left: 0.5rem;
          text-transform: uppercase;
        }
        
        .role-tag.admin {
          background: rgba(166, 123, 91, 0.2);
          color: var(--accent);
        }
        
        .user-actions {
          display: flex;
          gap: 0.75rem;
        }
        
        .nav-action-btn {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-decoration: none;
          padding: 0.35rem 0.6rem;
          border-radius: 0.35rem;
          transition: all 0.2s;
          background: rgba(255, 255, 255, 0.05);
        }
        
        .nav-action-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-primary);
        }
        
        .nav-action-btn.logout:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }
        
        /* Hamburger Button */
        .hamburger {
          display: none;
          flex-direction: column;
          justify-content: space-between;
          width: 24px;
          height: 18px;
          background: none;
          border: none;
          cursor: pointer;
          z-index: 1100;
          padding: 0;
        }
        
        .hamburger span {
          display: block;
          width: 100%;
          height: 2px;
          background-color: var(--text-primary);
          border-radius: 2px;
          transition: all 0.3s ease;
        }
        
        /* Tablet/Mobile Layouts */
        @media (max-width: 992px) {
          .hamburger {
            display: flex;
          }
          
          .nav-content {
            position: fixed;
            top: 0;
            right: -100%;
            width: 80%;
            max-width: 300px;
            height: 100vh;
            background: var(--bg-card);
            flex-direction: column;
            justify-content: flex-start;
            align-items: flex-start;
            padding: 80px 2rem 2rem;
            margin: 0;
            transition: 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
            border-left: 1px solid var(--glass-border);
          }
          
          .nav-content.show {
            right: 0;
          }
          
          .nav-links {
            flex-direction: column;
            width: 100%;
            gap: 1rem;
            margin-bottom: 2rem;
          }
          
          .nav-link {
            font-size: 1.1rem;
            width: 100%;
            padding: 0.75rem 0;
            border-bottom: 1px solid var(--glass-border);
          }
          
          .nav-auth-wrapper {
            flex-direction: column;
            width: 100%;
            align-items: flex-start;
            gap: 2rem;
          }
          
          .lang-toggle {
            width: 100%;
            justify-content: space-between;
          }
          
          .user-section {
            flex-direction: column;
            align-items: flex-start;
            width: 100%;
            padding: 0;
            background: none;
          }
          
          .user-actions {
            width: 100%;
            margin-top: 1rem;
            gap: 0.5rem;
          }
          
          .nav-action-btn {
            flex: 1;
            text-align: center;
            padding: 0.75rem;
          }
          
          /* Animation for Hamburger Menu Icon */
          .hamburger.active span:nth-child(1) {
            transform: translateY(8px) rotate(45deg);
          }
          .hamburger.active span:nth-child(2) {
            opacity: 0;
          }
          .hamburger.active span:nth-child(3) {
            transform: translateY(-8px) rotate(-45deg);
          }
        }
        
        @media (max-width: 480px) {
            .nav-content {
                width: 100%;
                max-width: none;
            }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
