import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import { mockService } from '../services/mockData';
import { storageService } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatDate } from '../utils/dateUtils';
import { FaCamera, FaSpinner, FaLock, FaUserEdit } from 'react-icons/fa';

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

    // Change Password State
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordData, setPasswordData] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    // Avatar Upload State
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState('');

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

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (passwordData.new !== passwordData.confirm) {
            setPasswordError(t('profile.passwordMismatch'));
            return;
        }

        setIsSavingPassword(true);
        try {
            await authService.changePassword(passwordData.current, passwordData.new);
            setPasswordSuccess(t('profile.passwordChanged'));
            setPasswordData({ current: '', new: '', confirm: '' });

            // Log operation
            await mockService.createLog({
                userId: user.id || user.uid,
                userName: user.name || user.displayName || user.email,
                description: `Changed own password`
            });

            setTimeout(() => {
                setIsChangingPassword(false);
                setPasswordSuccess('');
            }, 2000);
        } catch (err) {
            setPasswordError(err.message);
        } finally {
            setIsSavingPassword(false);
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadError('');
        setUploadSuccess('');
        setIsUploadingAvatar(true);

        try {
            const downloadURL = await storageService.uploadAvatar(member.id, file);

            // Update profile with new avatar URL
            const updated = await mockService.updateMember(member.id, {
                ...member,
                avatar: downloadURL
            });

            setMember(updated);
            setEditData(prev => ({ ...prev, avatar: downloadURL }));
            setUploadSuccess(t('profile.uploadSuccess'));

            // Log operation
            await mockService.createLog({
                userId: user.id || user.uid,
                userName: user.name || user.displayName || user.email,
                description: `Updated profile picture for ${member.name}`
            });

            setTimeout(() => setUploadSuccess(''), 3000);
        } catch (err) {
            setUploadError(err.message);
            setTimeout(() => setUploadError(''), 5000);
        } finally {
            setIsUploadingAvatar(false);
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
                    <div className="avatar-container">
                        <img src={member.avatar} alt={member.name} className="profile-avatar-lg" />

                        {isOwnProfile && (
                            <div className="avatar-actions">
                                <label className="upload-avatar-btn" title={t('profile.uploadAvatar')}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarUpload}
                                        style={{ display: 'none' }}
                                        disabled={isUploadingAvatar}
                                    />
                                    {isUploadingAvatar ? <FaSpinner className="spinner" /> : <FaCamera />}
                                </label>
                            </div>
                        )}

                        {isUploadingAvatar && (
                            <div className="upload-loader-overlay">
                                <FaSpinner className="spinner-large" />
                                <span>{t('profile.uploading')}</span>
                            </div>
                        )}

                        {uploadSuccess && <div className="avatar-success-toast">{uploadSuccess}</div>}
                        {uploadError && <div className="avatar-error-toast">{uploadError}</div>}
                    </div>
                    <div className="profile-info">
                        <div className="profile-title-row">
                            <h1 className="profile-name">
                                {member.name}
                                <span className={`status-badge ${member.status}`}>{member.status}</span>
                            </h1>
                            <p className="profile-username">@{member.username}</p>
                            <div className="profile-actions">
                                {isOwnProfile && (
                                    <button className="btn-text" onClick={() => setIsChangingPassword(true)}>
                                        <FaLock /> {t('profile.changePassword')}
                                    </button>
                                )}
                                {canEdit && (
                                    <button className="btn-text" onClick={() => setIsEditing(true)}>
                                        <FaUserEdit /> {t('profile.editProfile')}
                                    </button>
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

            {isChangingPassword && (
                <div className="modal-overlay">
                    <div className="card modal-card">
                        <h3>{t('profile.changePassword')}</h3>
                        {passwordError && <div className="error-message">{passwordError}</div>}
                        {passwordSuccess && <div className="success-message">{passwordSuccess}</div>}

                        <form onSubmit={handleChangePassword} className="form-vertical">
                            <div className="form-group">
                                <label>{t('profile.currentPassword')}</label>
                                <input
                                    type="password"
                                    className="input-field"
                                    value={passwordData.current}
                                    onChange={e => setPasswordData({ ...passwordData, current: e.target.value })}
                                    required
                                    autoComplete="current-password"
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('profile.newPassword')}</label>
                                <input
                                    type="password"
                                    className="input-field"
                                    value={passwordData.new}
                                    onChange={e => setPasswordData({ ...passwordData, new: e.target.value })}
                                    required
                                    autoComplete="new-password"
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('profile.confirmNewPassword')}</label>
                                <input
                                    type="password"
                                    className="input-field"
                                    value={passwordData.confirm}
                                    onChange={e => setPasswordData({ ...passwordData, confirm: e.target.value })}
                                    required
                                    autoComplete="new-password"
                                />
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary" disabled={isSavingPassword}>
                                    {isSavingPassword ? t('common.loading') : t('common.save')}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={() => {
                                        setIsChangingPassword(false);
                                        setPasswordError('');
                                        setPasswordData({ current: '', new: '', confirm: '' });
                                    }}
                                >
                                    {t('common.cancel')}
                                </button>
                            </div>
                        </form>
                    </div>
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
                border-radius: 50%;
                border: 4px solid var(--accent);
                object-fit: cover;
                transition: transform 0.3s ease;
                background: var(--glass-bg);
            }
            .avatar-container {
                position: relative;
                width: 140px;
                height: 140px;
            }
            .profile-avatar-lg {
                width: 140px;
                height: 140px;
            }
            
            .avatar-actions {
                position: absolute;
                bottom: 5px;
                right: 5px;
                z-index: 5;
            }
            
            .upload-avatar-btn {
                background: var(--accent);
                color: white;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                transition: all 0.2s ease;
                border: 2px solid var(--card-bg);
            }
            
            .upload-avatar-btn:hover {
                transform: scale(1.1);
                background: var(--primary);
            }
            
            .upload-loader-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                border-radius: 50%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 0.75rem;
                z-index: 4;
            }
            
            .spinner {
                animation: spin 1s linear infinite;
            }
            
            .spinner-large {
                font-size: 1.5rem;
                margin-bottom: 5px;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .avatar-success-toast {
                position: absolute;
                top: -20px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--success);
                color: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 0.75rem;
                white-space: nowrap;
                z-index: 10;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }
            
            .avatar-error-toast {
                position: absolute;
                top: -20px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--danger);
                color: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 0.75rem;
                white-space: nowrap;
                z-index: 10;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
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

            /* Modal Styles */
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                padding: 1rem;
            }
            .modal-card {
                width: 100%;
                max-width: 400px;
                padding: 2rem;
            }
            .modal-card h3 {
                margin-bottom: 1.5rem;
                text-align: center;
            }
            .form-vertical {
                display: flex;
                flex-direction: column;
                gap: 1.25rem;
            }
            .error-message {
                color: var(--danger);
                background: rgba(239, 68, 68, 0.1);
                padding: 0.75rem;
                border-radius: 0.5rem;
                margin-bottom: 1rem;
                font-size: 0.9rem;
                text-align: center;
            }
            .success-message {
                color: var(--success);
                background: rgba(16, 185, 129, 0.1);
                padding: 0.75rem;
                border-radius: 0.5rem;
                margin-bottom: 1rem;
                font-size: 0.9rem;
                text-align: center;
            }
        `}</style>
        </div>
    );
};

export default MemberProfile;
