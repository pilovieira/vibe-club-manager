import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { mockService } from '../services/mockData';
import { storageService } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useConfirm, useAlert } from '../context/ConfirmContext';
import { formatDate, formatMonthYear } from '../utils/dateUtils';
import { FaCamera, FaSpinner, FaLock, FaUserEdit, FaEnvelope, FaUser, FaCalendarAlt, FaVenusMars, FaIdCard, FaCar, FaPlus, FaTrash, FaEdit, FaTimes } from 'react-icons/fa';

const emptyVehicleForm = { name: '', nickname: '', year: '', description: '', photo: null, photoUrl: '' };

const MemberProfile = () => {
    const { id } = useParams();
    const { t, language } = useLanguage();
    const confirm = useConfirm();
    const alert = useAlert();
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

    // Avatar Upload State
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState('');

    // Vehicles State
    const [vehicles, setVehicles] = useState([]);
    const [showVehicleForm, setShowVehicleForm] = useState(false);
    const [editingVehicleId, setEditingVehicleId] = useState(null);
    const [vehicleForm, setVehicleForm] = useState(emptyVehicleForm);
    const [isSavingVehicle, setIsSavingVehicle] = useState(false);
    const [vehicleError, setVehicleError] = useState('');

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

                const memberVehicles = await mockService.getMemberVehicles(id);
                setVehicles(memberVehicles);
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

                // Calculate changed fields
                const changedFields = [];
                if (editData.name !== (member.name || '')) changedFields.push(t('profile.name'));
                if (editData.username.toLowerCase().trim() !== (member.username || '')) changedFields.push(t('member.username'));
                if (editData.email !== (member.email || '')) changedFields.push(t('profile.email'));
                if (editData.description !== (member.description || '')) changedFields.push(t('profile.bio'));
                if (editData.dateBirth !== (member.dateBirth || '')) changedFields.push(t('profile.dateBirth'));
                if (editData.gender !== (member.gender || '')) changedFields.push(t('gender.label'));
                if (editData.role !== (member.role || '')) changedFields.push(t('member.role'));
                if (editData.status !== (member.status || '')) changedFields.push(t('members.status'));

                const fieldsDescription = changedFields.length > 0 ? ` (${changedFields.join(', ')})` : '';

                // Log operation
                await mockService.createLog({
                    userId: user.id || user.uid,
                    userName: user.name || user.displayName || user.email,
                    description: `Updated profile for member: ${member.name}${fieldsDescription}`
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


    const handleToggleStatus = async () => {
        if (!member) return;

        const confirmMsg = member.status === 'active'
            ? t('profile.confirmDeactivate')
            : t('profile.confirmActivate');
        if (await confirm(confirmMsg)) {
            const toggleStatusAsync = async () => {
                try {
                    const newStatus = member.status === 'active' ? 'inactive' : 'active';
                    await mockService.updateMemberStatus(member.id, newStatus);
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
                    await alert(t(err.message) || err.message);
                }

            };
            toggleStatusAsync();
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

    const openAddVehicleForm = () => {
        setEditingVehicleId(null);
        setVehicleForm(emptyVehicleForm);
        setVehicleError('');
        setShowVehicleForm(true);
    };

    const openEditVehicleForm = (vehicle) => {
        setEditingVehicleId(vehicle.id);
        setVehicleForm({
            name: vehicle.name || '',
            nickname: vehicle.nickname || '',
            year: vehicle.year || '',
            description: vehicle.description || '',
            photo: null,
            photoUrl: vehicle.photo_url || ''
        });
        setVehicleError('');
        setShowVehicleForm(true);
    };

    const closeVehicleForm = () => {
        setShowVehicleForm(false);
        setEditingVehicleId(null);
        setVehicleForm(emptyVehicleForm);
        setVehicleError('');
    };

    const handleVehiclePhotoSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setVehicleForm(prev => ({ ...prev, photo: file, photoUrl: URL.createObjectURL(file) }));
    };

    const handleSaveVehicle = async (e) => {
        e.preventDefault();
        if (!vehicleForm.name.trim()) return;

        setIsSavingVehicle(true);
        setVehicleError('');
        try {
            let photoUrl = vehicleForm.photoUrl;
            if (vehicleForm.photo) {
                photoUrl = await storageService.uploadVehiclePhoto(member.id, vehicleForm.photo);
            }

            const vehicleData = {
                member_id: member.id,
                name: vehicleForm.name.trim(),
                nickname: vehicleForm.nickname.trim(),
                year: vehicleForm.year ? Number(vehicleForm.year) : null,
                description: vehicleForm.description.trim(),
                photo_url: photoUrl && !photoUrl.startsWith('blob:') ? photoUrl : ''
            };

            if (editingVehicleId) {
                const updated = await mockService.updateVehicle(editingVehicleId, vehicleData);
                setVehicles(prev => prev.map(v => v.id === editingVehicleId ? updated : v));
            } else {
                const created = await mockService.addVehicle(vehicleData);
                setVehicles(prev => [...prev, created]);
            }

            await mockService.createLog({
                userId: user.id || user.uid,
                userName: user.name || user.displayName || user.email,
                description: `${editingVehicleId ? 'Updated' : 'Added'} vehicle "${vehicleData.name}" for member: ${member.name}`
            });

            closeVehicleForm();
        } catch (err) {
            console.error('Error saving vehicle:', err);
            setVehicleError(err.message || t('common.error'));
        } finally {
            setIsSavingVehicle(false);
        }
    };

    const handleDeleteVehicle = async (vehicle) => {
        if (!(await confirm(t('vehicles.confirmDelete')))) return;

        try {
            await mockService.deleteVehicle(vehicle.id);
            if (vehicle.photo_url) {
                await storageService.deleteFile(vehicle.photo_url);
            }
            setVehicles(prev => prev.filter(v => v.id !== vehicle.id));

            await mockService.createLog({
                userId: user.id || user.uid,
                userName: user.name || user.displayName || user.email,
                description: `Removed vehicle "${vehicle.name}" from member: ${member.name}`
            });
        } catch (err) {
            console.error('Error deleting vehicle:', err);
            await alert(t('common.error'));
        }
    };

    if (!member) return <div className="container">{t('common.loading')}</div>;

    const isOwnProfile = user && user.id === member.id;
    const canEdit = isAdmin || isOwnProfile;

    const memberRole = member.role || 'member';

    return (
        <div className="container profile-page">
            {!isEditing ? (
                <div className="profile-card card animate-fade-in">
                    <div className="profile-content-top">
                        <div className="avatar-section">
                            <div className="avatar-container">
                                <img src={member.avatar} alt={member.name} className="profile-avatar-lg" />

                                {isOwnProfile && (
                                    <div className="avatar-actions">
                                        <label className="upload-avatar-btn-large" title={t('profile.uploadAvatar')}>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleAvatarUpload}
                                                style={{ display: 'none' }}
                                                disabled={isUploadingAvatar}
                                            />
                                            {isUploadingAvatar ? <FaSpinner className="spinner" /> : <FaCamera />}
                                            <span className="btn-label">{t('profile.changeAvatar')}</span>
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
                            <div className="profile-status-section">
                                <span className={`status-badge-premium ${member.status}`}>
                                    <span className="status-dot-inner"></span>
                                    {member.status === 'active' ? t('members.active') : t('members.inactive')}
                                </span>
                            </div>
                        </div>

                        <div className="profile-details-section">
                            <div className="profile-title-group">
                                <h1 className="profile-name-lg">{member.name}</h1>
                                <p className="profile-username-tag">@{member.username}</p>
                            </div>

                            <ul className="profile-info-list">
                                <li>
                                    <span className="info-icon"><FaEnvelope /></span>
                                    <span className="info-label">{t('profile.email')}:</span>
                                    <span className="info-value">{member.email}</span>
                                </li>
                                <li>
                                    <span className="info-icon"><FaIdCard /></span>
                                    <span className="info-label">{t('member.role')}:</span>
                                    <span className="info-value role-badge">{memberRole}</span>
                                </li>
                                <li>
                                    <span className="info-icon"><FaCalendarAlt /></span>
                                    <span className="info-label">{t('profile.memberSince')}:</span>
                                    <span className="info-value">{formatMonthYear(member.joinDate, language)}</span>
                                </li>
                                <li>
                                    <span className="info-icon"><FaVenusMars /></span>
                                    <span className="info-label">{t('gender.label')}:</span>
                                    <span className="info-value">{member.gender === 'female' ? t('gender.female') : t('gender.male')}</span>
                                </li>
                                {member.dateBirth && (
                                    <li>
                                        <span className="info-icon"><FaCalendarAlt /></span>
                                        <span className="info-label">{t('profile.dateBirth')}:</span>
                                        <span className="info-value">{formatDate(member.dateBirth, language)}</span>
                                    </li>
                                )}
                            </ul>

                            {member.description && (
                                <div className="profile-bio-box">
                                    <p className="bio-text">{member.description}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="profile-footer-actions">
                        {canEdit && (
                            <button className="btn-premium btn-edit" onClick={() => setIsEditing(true)}>
                                <FaUserEdit /> {t('profile.editProfile')}
                            </button>
                        )}
                        {isAdmin && (
                            <button
                                className={`btn-premium ${member.status === 'active' ? 'btn-deactivate' : 'btn-activate'}`}
                                onClick={handleToggleStatus}
                            >
                                {member.status === 'active' ? t('profile.setInactive') : t('profile.setActive')}
                            </button>
                        )}
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
                            <label>{t('member.role')}</label>
                            <select
                                className="input-field"
                                value={editData.role}
                                onChange={e => setEditData({ ...editData, role: e.target.value })}
                                disabled={!isAdmin}
                            >
                                <option value="member">{t('role.member')}</option>
                                <option value="admin">{t('role.admin')}</option>
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

            <div className="vehicles-section card">
                <div className="vehicles-header">
                    <h2 className="vehicles-title"><FaCar /> {t('vehicles.title')}</h2>
                    {canEdit && (
                        <button className="btn btn-primary btn-sm-icon" onClick={openAddVehicleForm}>
                            <FaPlus /> {t('vehicles.add')}
                        </button>
                    )}
                </div>

                {vehicles.length === 0 ? (
                    <p className="text-secondary text-center vehicles-empty">{t('vehicles.none')}</p>
                ) : (
                    <div className="vehicles-grid">
                        {vehicles.map(vehicle => (
                            <div key={vehicle.id} className="vehicle-card">
                                <div className="vehicle-photo-wrap">
                                    {vehicle.photo_url ? (
                                        <img src={vehicle.photo_url} alt={vehicle.name} className="vehicle-photo" />
                                    ) : (
                                        <div className="vehicle-photo-placeholder"><FaCar /></div>
                                    )}
                                    {vehicle.year && <span className="vehicle-year-badge">{vehicle.year}</span>}
                                </div>
                                <div className="vehicle-info">
                                    <h3 className="vehicle-name">{vehicle.name}</h3>
                                    {vehicle.nickname && <p className="vehicle-nickname">"{vehicle.nickname}"</p>}
                                    {vehicle.description && <p className="vehicle-description">{vehicle.description}</p>}
                                </div>
                                {canEdit && (
                                    <div className="vehicle-actions">
                                        <button className="btn-icon-sm" onClick={() => openEditVehicleForm(vehicle)} title={t('common.edit')}>
                                            <FaEdit />
                                        </button>
                                        <button className="btn-icon-sm danger" onClick={() => handleDeleteVehicle(vehicle)} title={t('common.delete')}>
                                            <FaTrash />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showVehicleForm && (
                <div className="modal-overlay" onClick={closeVehicleForm}>
                    <div className="modal-card card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-row">
                            <h3>{editingVehicleId ? t('vehicles.edit') : t('vehicles.add')}</h3>
                            <button className="btn-icon-sm" onClick={closeVehicleForm}><FaTimes /></button>
                        </div>
                        {vehicleError && <div className="error-message">{vehicleError}</div>}
                        <form onSubmit={handleSaveVehicle} className="form-vertical">
                            <div className="vehicle-photo-upload">
                                {vehicleForm.photoUrl ? (
                                    <img src={vehicleForm.photoUrl} alt="preview" className="vehicle-photo-preview" />
                                ) : (
                                    <div className="vehicle-photo-placeholder"><FaCar /></div>
                                )}
                                <label className="btn btn-outline btn-sm-icon vehicle-photo-btn">
                                    <input type="file" accept="image/*" onChange={handleVehiclePhotoSelect} style={{ display: 'none' }} />
                                    <FaCamera /> {t('vehicles.uploadPhoto')}
                                </label>
                            </div>
                            <div className="form-group">
                                <label>{t('vehicles.name')}</label>
                                <input
                                    className="input-field"
                                    value={vehicleForm.name}
                                    onChange={e => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                                    placeholder={t('vehicles.namePlaceholder')}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('vehicles.nickname')}</label>
                                <input
                                    className="input-field"
                                    value={vehicleForm.nickname}
                                    onChange={e => setVehicleForm({ ...vehicleForm, nickname: e.target.value })}
                                    placeholder={t('vehicles.nicknamePlaceholder')}
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('vehicles.year')}</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={vehicleForm.year}
                                    onChange={e => setVehicleForm({ ...vehicleForm, year: e.target.value })}
                                    placeholder="2020"
                                    min="1900"
                                    max="2100"
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('vehicles.description')}</label>
                                <textarea
                                    className="input-field"
                                    value={vehicleForm.description}
                                    onChange={e => setVehicleForm({ ...vehicleForm, description: e.target.value })}
                                    rows="3"
                                    placeholder={t('vehicles.descriptionPlaceholder')}
                                />
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary" disabled={isSavingVehicle}>
                                    {isSavingVehicle ? <FaSpinner className="spinner" /> : t('vehicles.save')}
                                </button>
                                <button type="button" className="btn btn-outline" onClick={closeVehicleForm}>{t('common.cancel')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
            .profile-page {
                max-width: 900px;
                margin: 0 auto;
                padding-top: 2rem;
            }
            .profile-card {
                background: var(--card-bg);
                border-radius: 1.5rem;
                border: 1px solid var(--glass-border);
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                position: relative;
            }
            
            .profile-content-top {
                display: flex;
                padding: 3rem;
                gap: 3rem;
            }
            
            .avatar-section {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1.5rem;
            }
            
            .avatar-container {
                position: relative;
                width: 180px;
                height: 180px;
            }
            
            .profile-avatar-lg {
                width: 180px;
                height: 180px;
                border-radius: 50%;
                border: 6px solid var(--accent);
                object-fit: cover;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
                background: var(--glass-bg);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .avatar-actions {
                position: absolute;
                bottom: -15px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 5;
                width: 100%;
                display: flex;
                justify-content: center;
            }
            
            /* Tablet & Mobile Responsiveness */
            @media (max-width: 992px) {
                .profile-content-top {
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                }
                
                .avatar-section {
                    margin-bottom: 2rem;
                }
                
                .profile-title-group {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                
                .profile-name-lg {
                    font-size: 2.25rem;
                }
            }
            
            @media (max-width: 768px) {
                .profile-page {
                    padding: 0;
                }
                
                .profile-card {
                    border-radius: 0;
                    border-left: none;
                    border-right: none;
                    padding: 1.5rem;
                }
                
                .profile-info-list {
                    grid-template-columns: 1fr;
                    gap: 0.75rem;
                }
                
                .profile-footer-actions {
                    flex-direction: column;
                }
                
                .profile-footer-actions .btn-premium {
                    width: 100%;
                }
                
                .profile-info-list li {
                    justify-content: center;
                }
            }
            
            .upload-avatar-btn-large {
                background: var(--accent);
                color: white;
                padding: 0.6rem 1rem;
                border-radius: 2rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                cursor: pointer;
                box-shadow: 0 6px 15px rgba(0, 0, 0, 0.4);
                transition: all 0.2s ease;
                border: 2px solid var(--card-bg);
                font-size: 0.85rem;
                font-weight: 600;
                white-space: nowrap;
            }
            
            .upload-avatar-btn-large:hover {
                transform: translateY(-2px);
                background: var(--primary);
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
            }
            
            .btn-label {
                margin-left: 2px;
            }
            
            .status-badge-premium {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.4rem 1rem;
                border-radius: 2rem;
                font-size: 0.85rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            
            .status-badge-premium.active {
                background: rgba(16, 185, 129, 0.15);
                color: #22c55e;
                border: 1px solid rgba(16, 185, 129, 0.3);
            }
            
            .status-badge-premium.inactive {
                background: rgba(239, 68, 68, 0.15);
                color: #ef4444;
                border: 1px solid rgba(239, 68, 68, 0.3);
            }
            
            .status-dot-inner {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: currentColor;
                box-shadow: 0 0 8px currentColor;
            }
            
            .profile-details-section {
                flex: 1;
            }
            
            .profile-title-group {
                margin-bottom: 2rem;
            }
            
            .profile-name-lg {
                font-size: 2.75rem;
                font-weight: 800;
                color: var(--text-primary);
                margin: 0;
                line-height: 1.1;
                letter-spacing: -0.02em;
            }
            
            .profile-username-tag {
                font-size: 1.25rem;
                color: var(--accent);
                font-weight: 600;
                margin-top: 0.5rem;
            }
            
            .profile-info-list {
                list-style: none;
                padding: 0;
                margin: 0 0 2rem 0;
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1.25rem;
            }
            
            .profile-info-list li {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                font-size: 1rem;
            }
            
            .info-icon {
                color: var(--accent);
                width: 20px;
                display: flex;
                justify-content: center;
                font-size: 1rem;
            }
            
            .info-label {
                color: var(--text-secondary);
                font-weight: 500;
                margin-right: 4px;
            }
            
            .info-value {
                color: var(--text-primary);
                font-weight: 600;
            }
            
            .role-badge {
                text-transform: capitalize;
                background: rgba(255, 255, 255, 0.05);
                padding: 0.2rem 0.6rem;
                border-radius: 0.5rem;
                font-size: 0.9rem;
            }
            
            .profile-bio-box {
                background: rgba(255, 255, 255, 0.03);
                border-radius: 1rem;
                padding: 1.5rem;
                border: 1px solid var(--glass-border);
            }
            
            .bio-text {
                margin: 0;
                color: var(--text-primary);
                line-height: 1.6;
                font-style: italic;
                font-size: 1.05rem;
            }
            
            .profile-footer-actions {
                display: flex;
                justify-content: center;
                gap: 1.5rem;
                padding: 2rem 3rem;
                background: rgba(0, 0, 0, 0.2);
                border-top: 1px solid var(--glass-border);
            }
            
            .btn-premium {
                padding: 0.75rem 1.75rem;
                border-radius: 1rem;
                font-weight: 700;
                display: flex;
                align-items: center;
                gap: 0.6rem;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                font-size: 0.95rem;
                border: 1px solid transparent;
            }
            
            .btn-password {
                background: rgba(255, 255, 255, 0.05);
                color: var(--text-primary);
                border-color: var(--glass-border);
            }
            
            .btn-edit {
                background: var(--primary);
                color: white;
            }
            
            .btn-deactivate {
                background: rgba(239, 68, 68, 0.1);
                color: #ef4444;
                border-color: rgba(239, 68, 68, 0.2);
            }
            
            .btn-activate {
                background: rgba(16, 185, 129, 0.1);
                color: #22c55e;
                border-color: rgba(16, 185, 129, 0.2);
            }
            
            .btn-premium:hover {
                transform: translateY(-3px);
                filter: brightness(1.2);
                box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
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
                font-size: 0.9rem;
                z-index: 10;
                backdrop-filter: blur(2px);
            }
            
            .animate-fade-in {
                animation: fadeIn 0.5s ease-out forwards;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            .spinner { animation: spin 1s linear infinite; }
            .spinner-large { animation: spin 1s linear infinite; font-size: 2rem; margin-bottom: 0.5rem; }

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
                max-height: 85vh;
                overflow-y: auto;
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

            /* Vehicles Section */
            .vehicles-section {
                margin-top: 2rem;
                padding: 2rem;
                border-radius: 1.5rem;
            }
            .vehicles-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1.5rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid var(--glass-border);
            }
            .vehicles-title {
                display: flex;
                align-items: center;
                gap: 0.6rem;
                font-size: 1.4rem;
                margin: 0;
            }
            .btn-sm-icon {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.6rem 1.1rem;
                font-size: 0.9rem;
                border-radius: 0.6rem;
            }
            .vehicles-empty {
                padding: 2rem 0;
            }
            .vehicles-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                gap: 1.5rem;
            }
            .vehicle-card {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid var(--glass-border);
                border-radius: 1rem;
                overflow: hidden;
                position: relative;
                transition: transform 0.2s, border-color 0.2s;
            }
            .vehicle-card:hover {
                transform: translateY(-3px);
                border-color: var(--primary);
            }
            .vehicle-photo-wrap {
                position: relative;
                aspect-ratio: 4/3;
                background: var(--bg-dark, #1a1a1a);
            }
            .vehicle-photo {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            .vehicle-photo-placeholder {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 2.5rem;
                color: var(--text-secondary);
                opacity: 0.4;
            }
            .vehicle-year-badge {
                position: absolute;
                top: 0.6rem;
                right: 0.6rem;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 0.2rem 0.6rem;
                border-radius: 0.5rem;
                font-size: 0.8rem;
                font-weight: 700;
            }
            .vehicle-info {
                padding: 1rem 1.25rem;
            }
            .vehicle-name {
                font-size: 1.1rem;
                margin: 0 0 0.15rem 0;
                color: var(--text-primary);
            }
            .vehicle-nickname {
                margin: 0 0 0.5rem 0;
                color: var(--accent);
                font-style: italic;
                font-size: 0.9rem;
            }
            .vehicle-description {
                margin: 0;
                color: var(--text-secondary);
                font-size: 0.9rem;
                line-height: 1.5;
            }
            .vehicle-actions {
                position: absolute;
                top: 0.6rem;
                left: 0.6rem;
                display: flex;
                gap: 0.4rem;
            }
            .btn-icon-sm {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: rgba(0, 0, 0, 0.6);
                color: white;
                border: none;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s;
            }
            .btn-icon-sm:hover {
                background: var(--primary);
            }
            .btn-icon-sm.danger:hover {
                background: var(--danger);
            }
            .modal-header-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1.5rem;
            }
            .modal-header-row h3 {
                margin: 0;
            }
            .vehicle-photo-upload {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.75rem;
            }
            .vehicle-photo-preview {
                width: 120px;
                height: 120px;
                border-radius: 1rem;
                object-fit: cover;
                border: 2px solid var(--glass-border);
            }
            .vehicle-photo-upload .vehicle-photo-placeholder {
                width: 120px;
                height: 120px;
                border-radius: 1rem;
                border: 2px dashed var(--glass-border);
                font-size: 2rem;
            }
            .vehicle-photo-btn {
                cursor: pointer;
            }

            @media (max-width: 768px) {
                .vehicles-section {
                    padding: 1.25rem;
                    border-radius: 0;
                }
                .vehicles-grid {
                    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                    gap: 1rem;
                }
            }
        `}</style>
        </div>
    );
};

export default MemberProfile;
