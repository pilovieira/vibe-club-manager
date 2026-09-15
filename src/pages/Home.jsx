import { useSettings } from '../context/SettingsContext';
import GenericLogo from '../components/GenericLogo';
import { useMemo } from 'react';
import { APP_NAME } from '../constants';

const Home = () => {
  const { settings, customPages = [] } = useSettings();

  const titleParts = APP_NAME.split(' ');
  const firstPart = titleParts[0];
  const secondPart = titleParts.slice(1).join(' ');

  const homePageContent = useMemo(() => {
    const homePage = customPages.find(p => p.path === 'home');
    if (homePage) {
        return homePage.content;
    }
    return null;
  }, [customPages]);

  return (
    <div className="home-page">
      <section className="hero">
        <div className="container hero-content">
          <div className="hero-logo-wrapper">
            {settings.app_logo ? (
              <img src={settings.app_logo} alt="Logo" className="hero-logo" />
            ) : (
              <GenericLogo className="hero-logo-generic" />
            )}
          </div>
          <h1 className="hero-title">{firstPart} <span className="text-gradient">{secondPart}</span>.</h1>
          
          <div className="hero-custom-content">
            {homePageContent ? (
                <div 
                    className="home-injected-page" 
                    dangerouslySetInnerHTML={{ __html: homePageContent }}
                />
            ) : (
                <p className="hero-subtitle">
                    {settings.home_description}
                </p>
            )}
          </div>

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
          margin-bottom: 2rem;
          letter-spacing: -0.02em;
        }
        .text-gradient {
          color: var(--primary);
          font-weight: 900;
          text-shadow: 0 0 20px var(--primary-shadow);
        }
        .hero-custom-content {
          margin-bottom: 3rem;
          display: flex;
          justify-content: center;
          width: 100%;
        }
        .home-injected-page {
            text-align: left;
            width: 100%;
            max-width: 800px;
            color: var(--text-primary);
            line-height: 1.6;
        }
        .hero-subtitle {
          font-size: 1.25rem;
          color: var(--text-secondary);
          max-width: 600px;
          margin: 0 auto;
        }
        .hero-logo-wrapper {
            display: flex;
            justify-content: center;
            margin-bottom: 2rem;
            animation: float 6s ease-in-out infinite;
        }
        .hero-logo, .hero-logo-generic {
            width: 150px;
            height: 150px;
            border-radius: 50%;
            border: 4px solid var(--accent);
            box-shadow: 0 0 20px var(--primary-semi);
            object-fit: cover;
        }
        .hero-logo-generic {
            background: var(--bg-card);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--accent);
            padding: 2rem;
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
