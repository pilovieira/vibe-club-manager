import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockService } from '../services/mockData';
import { storageService } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { FaCamera, FaArrowLeft, FaChevronLeft, FaChevronRight, FaTimes, FaSpinner, FaTrash } from 'react-icons/fa';

const EventGallery = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const { t } = useLanguage();

    const [event, setEvent] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const events = await mockService.getEvents();
                const currentEvent = events.find(e => e.id === eventId);
                setEvent(currentEvent);

                const eventPhotos = await mockService.getEventPhotos(eventId);
                setPhotos(eventPhotos);
            } catch (err) {
                console.error('Error fetching gallery data:', err);
                setError(t('events.uploadError'));
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [eventId, t]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setError('');
        setSuccess('');

        try {
            const downloadURL = await storageService.uploadEventPhoto(eventId, user.id, file);

            const newPhoto = {
                event_id: eventId,
                url: downloadURL,
                uploaded_by_id: user.id,
                uploaded_by_name: user.name || user.email,
                file_name: file.name
            };

            const savedPhoto = await mockService.addEventPhoto(newPhoto);
            setPhotos(prev => [savedPhoto, ...prev]);
            setSuccess(t('events.uploadSuccess'));

            // Log the upload
            await mockService.createLog({
                userId: user.id,
                userName: user.name || user.email,
                description: `Uploaded photo to event: ${event?.title || eventId}`
            });
        } catch (err) {
            console.error('Upload failed:', err);
            setError(err.message || t('events.uploadError'));
        } finally {
            setUploading(false);
        }
    };

    const handleDeletePhoto = async (photo, e) => {
        if (e) e.stopPropagation();

        if (!window.confirm(t('events.confirmDeletePhoto'))) return;

        try {
            setLoading(true);
            // 1. Delete from Firestore
            await mockService.deleteEventPhoto(photo.id);

            // 2. Delete from Storage
            await storageService.deleteFile(photo.url);

            // 3. Update local state
            setPhotos(prev => prev.filter(p => p.id !== photo.id));
            if (selectedIndex !== null) setSelectedIndex(null);

            setSuccess(t('events.deleteSuccess'));

            // Log the deletion
            await mockService.createLog({
                userId: user.id,
                userName: user.name || user.email,
                description: `Deleted photo from event: ${event?.title || eventId}`
            });
        } catch (err) {
            console.error('Delete failed:', err);
            setError(t('events.uploadError'));
        } finally {
            setLoading(false);
        }
    };

    const navigatePhoto = (direction) => {
        if (selectedIndex === null) return;
        let newIndex = selectedIndex + direction;
        if (newIndex < 0) newIndex = photos.length - 1;
        if (newIndex >= photos.length) newIndex = 0;
        setSelectedIndex(newIndex);
    };

    const handleKeyDown = (e) => {
        if (selectedIndex === null) return;
        if (e.key === 'ArrowLeft') navigatePhoto(-1);
        if (e.key === 'ArrowRight') navigatePhoto(1);
        if (e.key === 'Escape') setSelectedIndex(null);
    };

    useEffect(() => {
        if (selectedIndex !== null) {
            window.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        } else {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'auto';
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'auto';
        };
    }, [selectedIndex]);

    if (loading) {
        return (
            <div className="container gallery-loading">
                <FaSpinner className="spinner-large" />
                <p>{t('common.loading')}</p>
            </div>
        );
    }

    return (
        <div className="container event-gallery-page animate-fade-in">
            <header className="page-header">
                <div className="header-left">
                    <button className="btn-back" onClick={() => navigate('/events')}>
                        <FaArrowLeft /> <span>{t('events.backToEvents')}</span>
                    </button>
                    <div>
                        <h1 className="page-title">{event?.title}</h1>
                        <p className="page-subtitle">{t('events.gallery')}</p>
                    </div>
                </div>

                {user && (
                    <div className="upload-section">
                        <label className={`btn btn-primary upload-btn ${uploading ? 'disabled' : ''}`}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                disabled={uploading}
                                style={{ display: 'none' }}
                            />
                            {uploading ? <FaSpinner className="spinner" /> : <FaCamera />}
                            <span>{t('events.uploadPhoto')}</span>
                        </label>
                        <span className="max-size-hint">{t('events.maxSize')}: 10MB</span>
                    </div>
                )}
            </header>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="gallery-grid">
                {photos.length === 0 ? (
                    <div className="no-photos">
                        <p>{t('events.noPhotos')}</p>
                    </div>
                ) : (
                    photos.map((photo, index) => (
                        <div key={photo.id} className="gallery-item" onClick={() => setSelectedIndex(index)}>
                            <img src={photo.url} alt={`Photo ${index}`} loading="lazy" />
                            <div className="photo-info">
                                <span className="uploader">{photo.uploaded_by_name}</span>
                                {(isAdmin || user?.id === photo.uploaded_by_id) && (
                                    <button
                                        className="btn-delete-photo"
                                        onClick={(e) => handleDeletePhoto(photo, e)}
                                        title={t('events.deletePhoto')}
                                    >
                                        <FaTrash />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Expanded Photo View */}
            {selectedIndex !== null && (
                <div className="photo-modal-overlay" onClick={() => setSelectedIndex(null)}>
                    <div className="modal-top-actions" onClick={(e) => e.stopPropagation()}>
                        {(isAdmin || user?.id === photos[selectedIndex].uploaded_by_id) && (
                            <button
                                className="modal-delete"
                                onClick={(e) => handleDeletePhoto(photos[selectedIndex], e)}
                                title={t('events.deletePhoto')}
                            >
                                <FaTrash />
                            </button>
                        )}
                        <button className="modal-close" onClick={() => setSelectedIndex(null)}>
                            <FaTimes />
                        </button>
                    </div>

                    <button
                        className="nav-btn prev"
                        onClick={(e) => { e.stopPropagation(); navigatePhoto(-1); }}
                    >
                        <FaChevronLeft />
                    </button>

                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <img src={photos[selectedIndex].url} alt="Expanded view" />
                        <div className="modal-info">
                            <span className="modal-uploader">
                                {t('events.photoUploadedBy')}: <strong>{photos[selectedIndex].uploaded_by_name}</strong>
                            </span>
                            <span className="photo-counter">{selectedIndex + 1} / {photos.length}</span>
                        </div>
                    </div>

                    <button
                        className="nav-btn next"
                        onClick={(e) => { e.stopPropagation(); navigatePhoto(1); }}
                    >
                        <FaChevronRight />
                    </button>
                </div>
            )}

            <style>{`
                .event-gallery-page {
                    padding-bottom: 4rem;
                }
                .btn-delete-photo {
                    background: rgba(220, 38, 38, 0.8);
                    color: white;
                    border: none;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.9rem;
                }
                .btn-delete-photo:hover {
                    background: rgb(220, 38, 38);
                    transform: scale(1.1);
                }
                .photo-info {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    padding: 0.75rem;
                    background: linear-gradient(transparent, rgba(0,0,0,0.8));
                    color: white;
                    font-size: 0.8rem;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .modal-top-actions {
                    position: absolute;
                    top: 2rem;
                    right: 2rem;
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    z-index: 3010;
                }
                .modal-delete {
                    background: rgba(220, 38, 38, 0.2);
                    border: 1px solid rgba(220, 38, 38, 0.5);
                    color: #ef4444;
                    width: 45px;
                    height: 45px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .modal-delete:hover {
                    background: #dc2626;
                    color: white;
                    border-color: #dc2626;
                }
                .modal-close {
                    position: static;
                    background: none;
                    border: none;
                    color: white;
                    font-size: 2rem;
                    cursor: pointer;
                    opacity: 0.7;
                    transition: opacity 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .modal-close:hover {
                    opacity: 1;
                }
                .nav-btn {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    background: rgba(255,255,255,0.1);
                    border: none;
                    color: white;
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .nav-btn:hover {
                    background: var(--primary);
                }
                .nav-btn.prev { left: 2rem; }
                .nav-btn.next { right: 2rem; }

                .gallery-loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 60vh;
                    gap: 1.5rem;
                    color: var(--text-secondary);
                }

                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }
                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                }
                .btn-back {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid var(--glass-border);
                    color: var(--text-secondary);
                    padding: 0.6rem 1rem;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-back:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: var(--text-primary);
                }
                .page-subtitle {
                    color: var(--accent);
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    font-size: 0.8rem;
                }
                .upload-section {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 0.5rem;
                }
                .upload-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.8rem 1.5rem;
                }
                .max-size-hint {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    opacity: 0.7;
                }
                .gallery-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 1.5rem;
                    margin-top: 2rem;
                }
                .gallery-item {
                    position: relative;
                    aspect-ratio: 4/3;
                    border-radius: 1rem;
                    overflow: hidden;
                    cursor: pointer;
                    border: 1px solid var(--glass-border);
                    transition: transform 0.3s ease, border-color 0.3s ease;
                }
                .gallery-item:hover {
                    transform: scale(1.02);
                    border-color: var(--primary);
                }
                .gallery-item img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .gallery-item:hover .photo-info {
                    opacity: 1;
                }
                .uploader {
                    font-weight: 500;
                    opacity: 0.9;
                }
                .no-photos {
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 5rem;
                    background: rgba(255,255,255,0.02);
                    border-radius: 1rem;
                    border: 2px dashed var(--glass-border);
                    color: var(--text-secondary);
                }
                
                /* Modal */
                .photo-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.95);
                    z-index: 3000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(5px);
                }
                .modal-content {
                    max-width: 90vw;
                    max-height: 80vh;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .modal-content img {
                    max-width: 100%;
                    max-height: 80vh;
                    object-fit: contain;
                    border-radius: 0.5rem;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                }
                .modal-info {
                    margin-top: 1.5rem;
                    color: white;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .modal-uploader {
                    font-size: 1rem;
                    opacity: 0.9;
                }
                .photo-counter {
                    font-size: 0.85rem;
                    opacity: 0.6;
                }

                @media (max-width: 768px) {
                    .page-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 1.5rem;
                    }
                    .upload-section {
                        width: 100%;
                        align-items: stretch;
                    }
                    .nav-btn {
                        width: 45px;
                        height: 45px;
                        font-size: 1.2rem;
                    }
                    .nav-btn.prev { left: 1rem; }
                    .nav-btn.next { right: 1rem; }
                    .modal-top-actions { top: 1rem; right: 1rem; }
                }
            `}</style>
        </div>
    );
};

export default EventGallery;
