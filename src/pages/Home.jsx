import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const Home = () => {
  const { t } = useLanguage();
  return (
    <div className="home-page">
      <section className="hero">
        <div className="container hero-content">
          <img src="/logo.jpg" alt="Logo" className="hero-logo" />
          <h1 className="hero-title">{t('home.title')} <span className="text-gradient">{t('home.titleHighlight')}</span>.</h1>
          <p className="hero-subtitle">
            {t('home.subtitle')}
          </p>
          <div className="hero-buttons">
            <Link to="/members" className="btn btn-primary hero-btn">{t('home.exploreMembers')}</Link>
            <Link to="/events" className="btn btn-outline hero-btn">{t('home.upcomingEvents')}</Link>
          </div>
        </div>
      </section>

      <section className="features container">
        <div className="feature-card">
          <div className="feature-icon">🚙</div>
          <h3>{t('home.feature1.title')}</h3>
          <p>{t('home.feature1.desc')}</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">⛰️</div>
          <h3>{t('home.feature2.title')}</h3>
          <p>{t('home.feature2.desc')}</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🤝</div>
          <h3>{t('home.feature3.title')}</h3>
          <p>{t('home.feature3.desc')}</p>
        </div>
      </section>

      <style>{`
        .hero {
          min-height: 80vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          background: radial-gradient(circle at center, var(--primary-glow) 0%, transparent 70%);
          position: relative;
        }
        .hero-title {
          font-size: 4rem;
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 1.5rem;
          letter-spacing: -0.02em;
        }
        .text-gradient {
          color: var(--primary);
          font-weight: 900;
          text-shadow: 0 0 20px var(--primary-shadow);
        }
        .hero-subtitle {
          font-size: 1.25rem;
          color: var(--text-secondary);
          max-width: 600px;
          margin: 0 auto 2.5rem;
        }
        .hero-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
        .hero-btn {
          padding: 0.75rem 2rem;
          font-size: 1.1rem;
        }
        .features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          padding: 4rem 1rem;
        }
        .feature-card {
            background: var(--bg-card);
            padding: 2rem;
            border-radius: 1rem;
            border: 1px solid var(--glass-border);
            transition: transform 0.3s;
        }
        .feature-card:hover {
            transform: translateY(-5px);
            border-color: var(--primary);
        }
        .feature-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        h3 {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
        }
        p {
            margin-bottom: 0.5rem;
        }
        p {
            color: var(--text-secondary);
        }
        .hero-logo {
            width: 150px;
            height: 150px;
            border-radius: 50%;
            border: 4px solid var(--accent);
            margin-bottom: 2rem;
            box-shadow: 0 0 20px var(--primary-semi);
            animation: float 6s ease-in-out infinite;
        }
        @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
        }
      `}</style>
    </div>
  );
};

export default Home;
