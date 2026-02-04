import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mockService } from '../services/mockData';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const Members = () => {
    const { t } = useLanguage();
    const [members, setMembers] = useState([]);
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (loading) return; // Wait for auth to initialize

        const fetchMembers = async () => {
            try {
                const data = await mockService.getMembers();
                setMembers(data || []);
            } catch (err) {
                console.error('Error fetching members:', err);
            }
        };
        fetchMembers();
    }, [loading, user, navigate]);

    return (
        <div className="container members-page">
            <header className="page-header">
                <h1 className="page-title">{t('members.title')}</h1>
            </header>

            <div className="members-grid">
                {members.length === 0 ? (
                    <div className="no-members">
                        <p>{t('members.noMembersFound') || 'No members found.'}</p>
                    </div>
                ) : (
                    members.map(member => {
                        return (
                            <div key={member.id} className="member-card-wrapper">
                                <Link to={`/members/${member.id}`} className={`member-card ${member.status}`}>
                                    <div className="status-badge-container">
                                        <span className={`status-dot ${member.status}`}></span>
                                    </div>
                                    <img src={member.avatar} alt={member.name} className="member-avatar" />
                                    <div className="member-info">
                                        <h3 className="member-name">{member.name}</h3>
                                        <p className="member-role">{member.role} • {t('members.joined')} {member.joinDate ? new Date(member.joinDate).getFullYear() : 'N/A'}</p>
                                    </div>
                                </Link>
                            </div>
                        );
                    })
                )}
            </div>

            <style>{`
        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }
        .members-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1.5rem;
        }
        .member-card-wrapper {
            background: var(--bg-card);
            border-radius: 0.5rem;
            border: 1px solid var(--glass-border);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            transition: transform 0.2s;
        }
        .member-card-wrapper:hover {
            transform: translateY(-4px);
            border-color: var(--primary);
        }
        .member-card {
           padding: 1.5rem;
           display: flex;
           flex-direction: column;
           align-items: center;
           text-align: center;
           position: relative;
           text-decoration: none;
           color: inherit;
           flex: 1;
        }
        .member-card.active {
            background: rgba(16, 185, 129, 0.1); /* Green tint */
        }
        .member-card.inactive {
            background: rgba(239, 68, 68, 0.1); /* Red tint */
            opacity: 0.9;
        }
        .status-badge-container {
            position: absolute;
            top: 1rem;
            right: 1rem;
        }
        .status-dot {
            display: block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }
        .status-dot.active {
            background-color: var(--success);
            box-shadow: 0 0 5px var(--success);
        }
        .status-dot.inactive {
            background-color: var(--danger);
        }
        .member-avatar {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            margin-bottom: 1rem;
            border: 2px solid var(--accent);
            object-fit: cover;
        }
        .member-name {
            font-size: 1.1rem;
            margin-bottom: 0.25rem;
            color: var(--text-primary);
        }
        .member-role {
            font-size: 0.8rem;
            color: var(--text-secondary);
            text-transform: capitalize;
            margin-bottom: 0.25rem;
        }
        .member-detail-sm {
            font-size: 0.75rem;
            color: var(--text-secondary);
            opacity: 0.8;
        }
        
        .card-actions {
            display: flex;
            border-top: 1px solid var(--glass-border);
        }
        .btn-action {
            flex: 1;
            padding: 0.75rem;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            font-size: 0.85rem;
            cursor: pointer;
            transition: background 0.2s;
        }
        .btn-action.toggle:hover {
            background: rgba(255, 255, 255, 0.05);
            color: var(--accent);
        }

        .btn-text {
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
        }
        .btn-text:hover {
            color: var(--text-primary);
            text-decoration: underline;
        }
      `}</style>
        </div>
    );
};

export default Members;
