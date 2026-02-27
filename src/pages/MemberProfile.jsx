import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { mockService } from '../services/mockData';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatDate } from '../utils/dateUtils';

const MemberProfile = () => {
    const { id } = useParams();
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const [member, setMember] = useState(null);
    const { user, isAdmin, loading } = useAuth();
    const [isEditing, setIsEditing] = useState(location.state?.edit || false);



    // Edit Profile State
    const [error, setError] = useState('');
    const [editData, setEditData] = useState({
        name: '', username: '', email: '', avatar: '', description: '', dateBirth: '', status: 'active', gender: 'male', role: 'member'
    });

    useEffect(() => {
        if (loading) return;

        // Publicly accessible, no redirect to login needed

        const fetchMemberData = async () => {
            try {
                const m = await mockService.getMemberById(id);
                if (!m) {
                    navigate('/members'); // Redirect if not found
                    return;
                }
                setMember(m);

                // Initialize edit data
                setEditData({
                    name: m.name,
                    username: m.username || '',
                    email: m.email,
                    avatar: m.avatar,
                    description: m.description || '',
                    dateBirth: m.dateBirth || '',
                    status: m.status || 'active',
                    gender: m.gender || 'male',
                    role: m.role || 'member'
                });
                setError('');
            } catch (err) {
                console.error('Error fetching member details:', err);
                navigate('/members');
            }
        };
        fetchMemberData();
    }, [id, user, loading, navigate]);

    const handleUpdateProfile = (e) => {
        e.preventDefault();
        setError('');

        try {
            const fetchUpdate = async () => {
                const updated = await mockService.updateMember(member.id, {
                    ...editData,
                    username: editData.username.toLowerCase().trim(),
                    avatar: editData.avatar.trim() || member.avatar // Keep old avatar if empty
                });

                setMember(updated);
                setIsEditing(false);

                // Log operation
                await mockService.createLog({
                    userId: user.id || user.uid,
                    userName: user.name || user.displayName || user.email,
                    description: `Updated profile for member: ${member.name} (@${member.username})`
                });
            };
            fetchUpdate();
        } catch (err) {
            if (err.message === 'Username already exists') {
                setError(t('error.usernameExists'));
            } else {
                setError(err.message);
            }
        }
    };


    const handleToggleStatus = () => {
        if (!member) return;

        const confirmMsg = member.status === 'active'
            ? t('profile.confirmDeactivate')
            : t('profile.confirmActivate');
        if (window.confirm(confirmMsg)) {
            const toggleStatusAsync = async () => {
                try {
                    const newStatus = member.status === 'active' ? 'inactive' : 'active';
                    const updated = await mockService.updateMemberStatus(member.id, newStatus);
                    setMember({ ...member, status: newStatus });
                    setEditData({ ...editData, status: newStatus });

                    // Log operation
                    await mockService.createLog({
                        userId: user.id || user.uid,
                        userName: user.name || user.displayName || user.email,
                        description: `${newStatus === 'active' ? 'Activated' : 'Deactivated'} member: ${member.name}`
                    });
                } catch (err) {
                    console.error('Error updating status:', err);
                    alert(t(err.message) || err.message);
                }

            };
            toggleStatusAsync();
        }
    };

    if (!member) return <div className="container">Loading...</div>;

    const isOwnProfile = user && user.id === member.id;
    const canEdit = isAdmin || isOwnProfile;

    const memberRole = member.role || 'member';

    return (
        <div className="container profile-page">
            {!isEditing ? (
                <div className="profile-header card">
                    <img src={member.avatar} alt={member.name} className="profile-avatar-lg" />
                    <div className="profile-info">
                        <div className="profile-title-row">
                            <h1 className="profile-name">
                                {member.name}
                                <span className={`status-badge ${member.status}`}>{member.status}</span>
                            </h1>
                            <p className="profile-username">@{member.username}</p>
                            <div className="profile-actions">
                                {canEdit && (
                                    <button className="btn-text" onClick={() => setIsEditing(true)}>{t('profile.editProfile')}</button>
                                )}
                                {isAdmin && (
                                    <button
                                        className={`btn-sm ${member.status === 'active' ? 'btn-danger-light' : 'btn-success-light'}`}
                                        onClick={handleToggleStatus}
                                    >
                                        {member.status === 'active' ? t('profile.setInactive') : t('profile.setActive')}
                                    </button>
                                )}
                            </div>
                        </div>
                        <p className="profile-meta">{member.email} • {memberRole}</p>
                        <p className="profile-joined">{t('profile.memberSince')} {new Date(member.joinDate).getFullYear()}</p>
                        <div className="profile-meta-row">
                            {member.dateBirth && <p className="profile-meta">🎂 {formatDate(member.dateBirth, language)}</p>}
                            <p className="profile-meta">👤 {member.gender === 'female' ? t('gender.female') : t('gender.male')}</p>
                        </div>
                        {member.description && <p className="profile-bio">{member.description}</p>}
                    </div>
                </div>
            ) : (
                <div className="edit-profile-form card">
                    <h2>{t('profile.editProfile')}</h2>
                    {error && <div className="error-message" style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>}
                    <form onSubmit={handleUpdateProfile} className="edit-form-grid">
                        <div className="form-group">
                            <label>{t('member.name')}</label>
                            <input
                                className="input-field"
                                value={editData.name}
                                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>{t('member.username')}</label>
                            <input
                                className={`input-field ${error ? 'error' : ''}`}
                                value={editData.username}
                                onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group full-width">
                            <label>{t('profile.email')}</label>
                            <input
                                className="input-field"
                                value={editData.email}
                                onChange={e => setEditData({ ...editData, email: e.target.value })}
                                required
                                type="email"
                            />
                        </div>
                        <div className="form-group full-width">
                            <label>{t('profile.iconUrl')}</label>
                            <input
                                className="input-field"
                                value={editData.avatar}
                                onChange={e => setEditData({ ...editData, avatar: e.target.value })}
                                placeholder="http://..."
                            />
                        </div>
                        <div className="form-group">
                            <label>{t('profile.dateBirth')}</label>
                            <input
                                className="input-field"
                                value={editData.dateBirth}
                                onChange={e => setEditData({ ...editData, dateBirth: e.target.value })}
                                type="date"
                            />
                        </div>
                        <div className="form-group">
                            <label>{t('gender.label')}</label>
                            <select
                                className="input-field"
                                value={editData.gender}
                                onChange={e => setEditData({ ...editData, gender: e.target.value })}
                            >
                                <option value="male">{t('gender.male')}</option>
                                <option value="female">{t('gender.female')}</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>{t('member.role') || 'Role'}</label>
                            <select
                                className="input-field"
                                value={editData.role}
                                onChange={e => setEditData({ ...editData, role: e.target.value })}
                                disabled={!isAdmin}
                            >
                                <option value="member">{t('role.member') || 'Member'}</option>
                                <option value="admin">{t('role.admin') || 'Admin'}</option>
                            </select>
                        </div>
                        <div className="form-group full-width">
                            <label>{t('profile.bio')}</label>
                            <textarea
                                className="input-field"
                                value={editData.description}
                                onChange={e => setEditData({ ...editData, description: e.target.value })}
                                rows="3"
                            />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary">{t('profile.saveChanges')}</button>
                            <button type="button" className="btn btn-outline" onClick={() => setIsEditing(false)}>{t('profile.cancel')}</button>
                        </div>
                    </form>
                </div>
            )}


            <style>{`
            .profile-page {
                max-width: 800px;
            }
            .profile-header {
                display: flex;
                align-items: flex-start;
                gap: 2rem;
                margin-bottom: 3rem;
                position: relative;
            }
            .profile-header.edit-mode {
                flex-direction: column;
                gap: 1.5rem;
            }
            .profile-avatar-lg {
                width: 120px;
                height: 120px;
                border-radius: 50%;
                border: 4px solid var(--accent);
                object-fit: cover;
            }
            .profile-info {
                flex: 1;
            }
            .profile-name {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin: 0;
            font-size: 2.25rem;
        }
        .profile-username {
            color: var(--accent);
            font-weight: 600;
            margin: 0.25rem 0 0.75rem 0;
            font-size: 1.1rem;
        }
        .profile-badges {
                font-size: 2rem;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            .status-badge {
                font-size: 0.8rem;
                padding: 0.2rem 0.6rem;
                border-radius: 9999px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                font-weight: 700;
            }
            .status-badge.active {
                background: rgba(16, 185, 129, 0.2);
                color: var(--success);
                border: 1px solid rgba(16, 185, 129, 0.3);
            }
            .status-badge.inactive {
                background: rgba(239, 68, 68, 0.2);
                color: var(--danger);
                border: 1px solid rgba(239, 68, 68, 0.3);
            }
            .profile-meta {
                color: var(--text-secondary);
                text-transform: capitalize;
                margin-bottom: 0.25rem;
            }
            .profile-joined {
                color: var(--text-secondary);
                font-size: 0.85rem;
                margin-bottom: 1rem;
            }
            .profile-bio {
                margin-top: 1rem;
                padding-top: 1rem;
                border-top: 1px solid var(--glass-border);
                font-style: italic;
                color: var(--text-primary);
            }
            .profile-meta-row {
                display: flex;
                gap: 1.5rem;
                margin-bottom: 0.5rem;
            }
            
            .edit-form-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
                width: 100%;
            }
            .form-group {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            .form-group.full-width {
                grid-column: span 2;
            }
            .profile-actions {
                display: flex;
                gap: 1rem;
                align-items: center;
            }
            .btn-sm {
                padding: 0.25rem 0.5rem;
                font-size: 0.75rem;
                border-radius: 0.25rem;
                cursor: pointer;
                border: 1px solid transparent;
            }
            .btn-danger-light {
                background: rgba(239, 68, 68, 0.1);
                color: var(--danger);
                border-color: rgba(239, 68, 68, 0.2);
            }
            .btn-danger-light:hover {
                background: rgba(239, 68, 68, 0.2);
            }
            .btn-success-light {
                background: rgba(16, 185, 129, 0.1);
                color: var(--success);
                border-color: rgba(16, 185, 129, 0.2);
            }
            .btn-success-light:hover {
                background: rgba(16, 185, 129, 0.2);
            }
        `}</style>
        </div>
    );
};

export default MemberProfile;
