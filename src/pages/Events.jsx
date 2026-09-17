import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockService } from '../services/mockData';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useConfirm, useAlert } from '../context/ConfirmContext';
import { useSettings } from '../context/SettingsContext';
import { FaImages, FaLock, FaGlobe, FaUsers, FaTimes, FaImage, FaTrash, FaSpinner } from 'react-icons/fa';
import { parseSafeDate } from '../utils/dateUtils';
import MapLocationPicker from '../components/MapLocationPicker';

const Events = () => {
    const navigate = useNavigate();
    const { user, isAdmin, isSuperuser } = useAuth();
    const { t, language } = useLanguage();
    const confirm = useConfirm();
    const alert = useAlert();
    const { settings } = useSettings();
    const [events, setEvents] = useState([]);
    const [members, setMembers] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);

    // Dynamic Event Types
    const eventTypes = useMemo(() => {
        const types = settings.event_types;
        if (Array.isArray(types) && types.length > 0) {
            return types.map(t => t.trim()).filter(Boolean);
        }
        // Fallback to defaults if not set
        return ['soft trail', 'hard trail', 'members meetup', 'club official meetup'];
    }, [settings.event_types]);

    // Create Event State
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingEventId, setEditingEventId] = useState(null);
    const [newEvent, setNewEvent] = useState({
        title: '',
        date: '',
        location: '',
        coordinates: null,
        description: '',
        eventType: '',
        visibility: 'private', // default
        coverImage: ''
    });
    const [showMapPicker, setShowMapPicker] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const coverInputRef = useRef(null);

    // Modal state for attendees
    const [showAttendeesModal, setShowAttendeesModal] = useState(false);
    const [modalEvent, setModalEvent] = useState(null);

    // Initialize eventType with first available
    useEffect(() => {
        if (!newEvent.eventType && eventTypes.length > 0) {
            setNewEvent(prev => ({ ...prev, eventType: eventTypes[0] }));
        }
    }, [eventTypes, newEvent.eventType]);

    const fetchEventsAndMembers = async () => {
        setDataLoading(true);
        try {
            const fetchedEvents = await mockService.getEvents();
            // Sort oldest first (chronological)
            const sortedEvents = [...fetchedEvents].sort((a, b) => new Date(a.date) - new Date(b.date));
            setEvents(sortedEvents);
            const fetchedMembers = await mockService.getMembers();
            setMembers(fetchedMembers);
        } catch (err) {
            console.error('Error fetching events/members:', err);
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        fetchEventsAndMembers();
    }, []);

    const handleCreateEvent = (e) => {
        e.preventDefault();
        const createOrUpdateEventAsync = async () => {
            try {
                if (editingEventId) {
                    const updated = await mockService.updateEvent(editingEventId, newEvent);
                    setEvents(events.map(ev => ev.id === editingEventId ? updated : ev));
                } else {
                    const created = await mockService.createEvent({ ...newEvent, createdBy: user.id || user.uid });
                    setEvents([created, ...events]);
                }
                setShowCreateForm(false);
                setEditingEventId(null);
                setNewEvent({ title: '', date: '', location: '', coordinates: null, description: '', eventType: eventTypes[0] || '', visibility: 'private', coverImage: '' });

                // Log operation
                await mockService.createLog({
                    userId: user.id || user.uid,
                    userName: user.profile?.name || user.email,
                    userEmail: user.email,
                    description: `${editingEventId ? 'Updated' : 'Created'} event: ${newEvent.title}`
                });
            } catch (err) {
                console.error('Error creating/updating event:', err);
            }
        };
        createOrUpdateEventAsync();
    };

    const handleDeleteEvent = async (event) => {
        if (!(await confirm(t('events.confirmDelete').replace('{title}', event.title)))) return;

        try {
            await mockService.deleteEvent(event.id);
            setEvents(events.filter(ev => ev.id !== event.id));
            await mockService.createLog({
                userId: user.id || user.uid,
                userName: user.profile?.name || user.email,
                userEmail: user.email,
                description: `Deleted event: ${event.title}`
            });
        } catch (err) {
            console.error('Error deleting event:', err);
        }
    };

    const handleStartEdit = (event) => {
        setEditingEventId(event.id);
        setNewEvent({
            title: event.title,
            date: event.date,
            location: event.location,
            coordinates: event.coordinates || null,
            description: event.description,
            eventType: event.eventType || eventTypes[0] || '',
            visibility: event.visibility || 'private',
            coverImage: event.coverImage || ''
        });
        setShowCreateForm(true);
    };

    const handleCoverUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploadingCover(true);
        try {
            const fileName = `cover_${Date.now()}_${file.name}`;
            const storagePath = `events/${editingEventId || 'new'}/cover/${fileName}`;
            const url = await mockService.uploadImage(storagePath, file);
            setNewEvent(prev => ({ ...prev, coverImage: url }));
        } catch (err) {
            console.error('Error uploading cover image:', err);
            await alert(t('events.uploadError'));
        } finally {
            setIsUploadingCover(false);
            e.target.value = '';
        }
    };

    const handleToggleEvent = async (eventId) => {
        if (!user) return;

        const event = events.find(e => e.id === eventId);
        const eventDate = parseSafeDate(event.date);
        const isPast = eventDate < new Date();

        if (isPast) {
            await alert(t('events.ended'));
            return;
        }

        const attending = event.attendees.includes(user.id);

        const toggleEventAsync = async () => {
            try {
                if (attending) {
                    // Leave Event
                    if (await confirm(t('events.confirmLeave') || "Are you sure you want to leave this event?")) {
                        await mockService.leaveEvent(eventId, user.id);
                        await fetchEventsAndMembers(); // Refresh after action

                        // Log operation
                        await mockService.createLog({
                            userId: user.id || user.uid,
                            userName: user.profile?.name || user.email,
                            userEmail: user.email,
                            description: `Left event: ${event.title}`
                        });
                    }
                } else {
                    // Join Event
                    if (user.status === 'inactive') {
                        await alert(t('events.inactiveWarning'));
                        return;
                    }
                    await mockService.joinEvent(eventId, user.id);
                    await fetchEventsAndMembers(); // Refresh after action

                    // Log operation
                    await mockService.createLog({
                        userId: user.id || user.uid,
                        userName: user.profile?.name || user.email,
                        userEmail: user.email,
                        description: `Joined event: ${event.title}`
                    });
                }
            } catch (err) {
                console.error('Error toggling event attendance:', err);
            }
        };
        toggleEventAsync();
    };

    const isAttending = (event) => {
        return user && event.attendees.includes(user.id);
    };

    const getAttendeeDetails = (attendeeIds) => {
        return attendeeIds.map(id => members.find(m => m.id === id)).filter(Boolean);
    };

    const handleShowAttendees = (event) => {
        setModalEvent(event);
        setShowAttendeesModal(true);
    };

    const renderEventCard = (event) => (
        <div key={event.id} className="event-card-wrapper animate-fade-in">
            <div className={`event-card shadow-sm event-type-${(event.eventType || '').replace(/\s+/g, '-')}`}>
                {event.coverImage && (
                    <img src={event.coverImage} alt={event.title} className="event-cover-img" />
                )}
                <div className="event-card-content">
                    <div className="event-date">
                        {language === 'en' ? (
                            <>
                                <span className="month">{parseSafeDate(event.date).toLocaleString('en-US', { month: 'short' })}</span>
                                <span className="day">{parseSafeDate(event.date).getDate()}</span>
                            </>
                        ) : (
                            <>
                                <span className="day">{parseSafeDate(event.date).getDate()}</span>
                                <span className="month">{parseSafeDate(event.date).toLocaleString('pt-BR', { month: 'short' })}</span>
                            </>
                        )}
                        <span className="year">{parseSafeDate(event.date).getFullYear()}</span>
                        {event.date.includes('T') && (
                            <span className="time">{parseSafeDate(event.date).toLocaleTimeString(language === 'en' ? 'en-US' : 'pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                    </div>
                    <div className="event-body">
                        <div className="event-info-header">
                            <div className="title-row">
                                <h2>{event.title}</h2>
                                {event.visibility === 'public' ? (
                                    <span className="visibility-badge public" title={t('events.public')}>
                                        <FaGlobe />
                                    </span>
                                ) : (
                                    <span className="visibility-badge private" title={t('events.private')}>
                                        <FaLock />
                                    </span>
                                )}
                            </div>
                            <div className="event-badge-row">
                                <span className={`type-badge ${(event.eventType || '').replace(/\s+/g, '-')}`}>
                                    {t(`events.type.${(event.eventType || '').replace(/\s+/g, '-')}`) !== `events.type.${(event.eventType || '').replace(/\s+/g, '-')}` 
                                        ? t(`events.type.${(event.eventType || '').replace(/\s+/g, '-')}`) 
                                        : (event.eventType || '')}
                                </span>
                            </div>
                        </div>
                        {event.location && <p className="event-meta">📍 {event.location}</p>}
                        {event.coordinates && (
                            <a
                                className="event-meta map-link"
                                href={`https://www.openstreetmap.org/?mlat=${event.coordinates.lat}&mlon=${event.coordinates.lng}#map=16/${event.coordinates.lat}/${event.coordinates.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                            >
                                🗺️ {t('events.viewOnMap')}
                            </a>
                        )}
                        <p className="event-desc">{event.description}</p>

                        <div className="attendees-section">
                            <span className="attendees-label">{t('events.attendees')} ({event.attendees.length})</span>
                            <div className="attendee-list">
                                {event.attendees.length === 0 ? (
                                    <span className="no-attendees">{t('events.beFirst')}</span>
                                ) : (
                                    getAttendeeDetails(event.attendees).map(member => (
                                        <div key={member.id} className="attendee-chip" title={member.name}>
                                            <img
                                                src={member.avatar}
                                                alt={member.name}
                                                className="attendee-avatar"
                                            />
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="event-footer-actions">
                    {user ? (
                        <>
                            <button
                                className={`action-btn join-btn ${isAttending(event) ? 'attending' : ''} ${parseSafeDate(event.date) < new Date() ? 'disabled' : ''}`}
                                onClick={() => handleToggleEvent(event.id)}
                                disabled={parseSafeDate(event.date) < new Date() || (user.status === 'inactive' && !isAttending(event))}
                            >
                                {parseSafeDate(event.date) < new Date()
                                    ? t('events.ended')
                                    : isAttending(event)
                                        ? t('events.leave')
                                        : (user.status === 'inactive' ? t('events.inactiveWarning') : t('events.join'))}
                            </button>
                            <button
                                className="action-btn gallery-btn"
                                onClick={() => navigate(`/events/${event.id}/gallery`)}
                            >
                                <FaImages /> <span>{t('events.gallery')}</span>
                            </button>
                            {(isAdmin || (user && event.createdBy === (user.id || user.uid))) && (
                                <button
                                    className="action-btn edit-btn"
                                    onClick={() => handleStartEdit(event)}
                                >
                                    <span>✏️ {t('common.edit')}</span>
                                </button>
                            )}
                            {isSuperuser && (
                                <button
                                    className="action-btn delete-event-btn"
                                    onClick={() => handleDeleteEvent(event)}
                                >
                                    <FaTrash /> <span>{t('common.delete')}</span>
                                </button>
                            )}
                            {event.attendees.length > 0 && (
                                <button
                                    className="action-btn view-attendees-btn"
                                    onClick={() => handleShowAttendees(event)}
                                >
                                    <FaUsers /> <span>{t('events.showAllAttendees')}</span>
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            <button
                                className="action-btn gallery-btn"
                                onClick={() => navigate(`/events/${event.id}/gallery`)}
                            >
                                <FaImages /> <span>{t('events.gallery')}</span>
                            </button>
                            {event.attendees.length > 0 && (
                                <button
                                    className="action-btn view-attendees-btn"
                                    onClick={() => handleShowAttendees(event)}
                                >
                                    <FaUsers /> <span>{t('events.showAllAttendees')}</span>
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    // Initial Filter: If not logged in, only public events
    const initialFilteredByVisibility = useMemo(() => {
        if (!user) {
            return events.filter(e => e.visibility === 'public');
        }
        return events;
    }, [events, user]);

    const filteredEvents = initialFilteredByVisibility.filter(event => {
        const eventDate = parseSafeDate(event.date);
        if (startDate && eventDate < new Date(startDate + 'T00:00:00')) return false;
        if (endDate && eventDate > new Date(endDate + 'T23:59:59')) return false;
        return true;
    });

    const upcomingEvents = filteredEvents
        .filter(event => parseSafeDate(event.date) >= new Date())
        .sort((a, b) => parseSafeDate(a.date) - parseSafeDate(b.date));

    const pastEvents = filteredEvents
        .filter(event => parseSafeDate(event.date) < new Date())
        .sort((a, b) => parseSafeDate(b.date) - parseSafeDate(a.date));

    return (
        <div className="container events-page">
            <header className="page-header">
                <div className="header-left">
                    <h1 className="page-title">{t('events.title')}</h1>
                    <div className="events-date-filters">
                        <div className="date-filter-item">
                            <label>{t('log.startDate')}</label>
                            <input
                                type="date"
                                className="input-field"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="date-filter-item">
                            <label>{t('log.endDate')}</label>
                            <input
                                type="date"
                                className="input-field"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        {(startDate || endDate) && (
                            <button className="btn btn-outline btn-clear" onClick={() => { setStartDate(''); setEndDate(''); }}>
                                {t('common.clear')}
                            </button>
                        )}
                    </div>
                </div>
                {user && (
                    <button className="btn btn-primary btn-new-event" onClick={() => setShowCreateForm(!showCreateForm)}>
                        {showCreateForm ? t('events.cancel') : t('events.createNew')}
                    </button>
                )}
            </header>

            {showCreateForm && (
                <div className="card create-event-form">
                    <h2>{editingEventId ? t('events.edit') : t('events.newEvent')}</h2>
                    <form onSubmit={handleCreateEvent}>
                        <div className="form-group">
                            <label>{t('events.eventTitle')}</label>
                            <input className="input-field" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>{t('events.coverImage')}</label>
                            <div className="cover-image-field">
                                {newEvent.coverImage ? (
                                    <div className="cover-preview">
                                        <img src={newEvent.coverImage} alt="Cover" />
                                        <button
                                            type="button"
                                            className="btn-icon delete cover-remove"
                                            onClick={() => setNewEvent(prev => ({ ...prev, coverImage: '' }))}
                                            title={t('pageEditor.removeCoverImage')}
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        className="btn btn-outline cover-upload-btn"
                                        onClick={() => coverInputRef.current?.click()}
                                        disabled={isUploadingCover}
                                    >
                                        {isUploadingCover ? <FaSpinner className="icon-spin" /> : <FaImage />}
                                        {t('pageEditor.uploadImage')}
                                    </button>
                                )}
                                <input
                                    type="file"
                                    ref={coverInputRef}
                                    style={{ display: 'none' }}
                                    accept="image/*"
                                    onChange={handleCoverUpload}
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>{t('events.date')}</label>
                                <input type="datetime-local" className="input-field" value={newEvent.date} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>{t('events.location')}</label>
                                <input className="input-field" value={newEvent.location} onChange={e => setNewEvent({ ...newEvent, location: e.target.value })} />
                                <div className="map-pick-row">
                                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowMapPicker(true)}>
                                        📍 {newEvent.coordinates ? t('events.changeLocationOnMap') : t('events.pickLocationOnMap')}
                                    </button>
                                    {newEvent.coordinates && (
                                        <button type="button" className="map-pick-clear" onClick={() => setNewEvent({ ...newEvent, coordinates: null })} title={t('events.clearLocation')}>
                                            <FaTimes />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>{t('events.type')}</label>
                                <select
                                    className="input-field"
                                    value={newEvent.eventType}
                                    onChange={e => setNewEvent({ ...newEvent, eventType: e.target.value })}
                                    required
                                >
                                    {eventTypes.map(type => (
                                        <option key={type} value={type}>
                                            {t(`events.type.${type.replace(/\s+/g, '-')}`) !== `events.type.${type.replace(/\s+/g, '-')}` 
                                                ? t(`events.type.${type.replace(/\s+/g, '-')}`) 
                                                : type}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>{t('events.visibility') || 'Visibility'}</label>
                                <select
                                    className="input-field"
                                    value={newEvent.visibility}
                                    onChange={e => setNewEvent({ ...newEvent, visibility: e.target.value })}
                                    required
                                >
                                    <option value="private">{t('events.private') || 'Private (Members only)'}</option>
                                    <option value="public">{t('events.public') || 'Public (Everyone)'}</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>{t('events.description')}</label>
                            <textarea className="input-field" rows="3" value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} required></textarea>
                        </div>
                        <button type="submit" className="btn btn-primary">
                            {editingEventId ? t('events.saveChanges') : t('events.createEvent')}
                        </button>
                    </form>
                </div>
            )}

            {showMapPicker && (
                <MapLocationPicker
                    initialPosition={newEvent.coordinates}
                    onClose={() => setShowMapPicker(false)}
                    onConfirm={(position) => {
                        setNewEvent({ ...newEvent, coordinates: position });
                        setShowMapPicker(false);
                    }}
                />
            )}

            <div className="events-list-container">
                {dataLoading ? (
                    <div className="loader-container">
                        <div className="loader"></div>
                        <p className="loading-text">{t('common.loading')}</p>
                    </div>
                ) : (
                    <>
                        {/* Upcoming Events Section */}
                        <div className="events-section">
                            <h2 className="section-title">{t('events.upcomingTitle')}</h2>
                            <div className="events-list">
                                {upcomingEvents.length === 0 ? (
                                    <div className="no-events-hint">
                                        <p>{t('events.noUpcoming')}</p>
                                    </div>
                                ) : (
                                    upcomingEvents.map(event => renderEventCard(event))
                                )}
                            </div>
                        </div>

                        {/* Past Events Section */}
                        <div className="events-section past-events-section animate-fade-in">
                            <h2 className="section-title section-title-past">{t('events.pastTitle')}</h2>
                            <div className="events-list">
                                {pastEvents.length === 0 ? (
                                    <div className="no-events-hint">
                                        <p>{t('events.noPast')}</p>
                                    </div>
                                ) : (
                                    pastEvents.map(event => renderEventCard(event))
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Attendees Modal */}
            {showAttendeesModal && modalEvent && (
                <div className="modal-overlay" onClick={() => setShowAttendeesModal(false)}>
                    <div className="modal-content card animate-fade-in" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{t('events.attendees')} - {modalEvent.title}</h3>
                            <button className="btn-close" onClick={() => setShowAttendeesModal(false)}>
                                <FaTimes />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="attendees-detailed-list">
                                {getAttendeeDetails(modalEvent.attendees).map(member => (
                                    <div 
                                        key={member.id} 
                                        className="attendee-item"
                                        onClick={() => {
                                            setShowAttendeesModal(false);
                                            navigate(`/members/${member.id}`);
                                        }}
                                    >
                                        <img src={member.avatar} alt={member.name} className="attendee-avatar-md" />
                                        <div className="attendee-info">
                                            <span className="attendee-name">{member.name}</span>
                                            <span className="attendee-role">{member.role}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        /* Modal Styles */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            backdrop-filter: blur(4px);
        }
        .modal-content {
            width: 100%;
            max-width: 450px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            padding: 0;
        }
        .modal-header {
            padding: 1.5rem;
            border-bottom: 1px solid var(--glass-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .modal-header h3 {
            margin: 0;
            font-size: 1.2rem;
            color: var(--primary);
        }
        .btn-close {
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 1.2rem;
            transition: color 0.2s;
        }
        .btn-close:hover {
            color: var(--text-primary);
        }
        .modal-body {
            padding: 1rem;
            overflow-y: auto;
        }
        .attendees-detailed-list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        .attendee-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 0.75rem;
            border-radius: 0.75rem;
            cursor: pointer;
            transition: background 0.2s;
        }
        .attendee-item:hover {
            background: rgba(255, 255, 255, 0.05);
        }
        .attendee-avatar-md {
            width: 45px;
            height: 45px;
            border-radius: 50%;
            border: 2px solid var(--glass-border);
            object-fit: cover;
        }
        .attendee-info {
            display: flex;
            flex-direction: column;
        }
        .attendee-name {
            font-weight: 600;
            color: var(--text-primary);
        }
        .attendee-role {
            font-size: 0.75rem;
            color: var(--text-secondary);
            text-transform: capitalize;
        }
        

        .create-event-form {
            max-width: 800px;
            margin-bottom: 2.5rem;
            padding: 2.5rem;
        }
        .form-group {
            margin-bottom: 1rem;
        }
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            color: var(--text-secondary);
        }
        .map-pick-row {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-top: 0.5rem;
        }
        .btn-sm {
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
        }
        .map-pick-clear {
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            display: flex;
            align-items: center;
            padding: 0.25rem;
        }
        .map-pick-clear:hover {
            color: var(--danger);
        }
        .map-link {
            display: inline-block;
            color: var(--accent);
            text-decoration: none;
        }
        .map-link:hover {
            text-decoration: underline;
        }
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }
        .cover-image-field {
            display: flex;
        }
        .cover-upload-btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .cover-preview {
            position: relative;
            width: 100%;
            max-width: 400px;
        }
        .cover-preview img {
            width: 100%;
            max-height: 180px;
            object-fit: cover;
            border-radius: 0.75rem;
            border: 1px solid var(--glass-border);
        }
        .cover-remove {
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            background: rgba(0,0,0,0.6);
        }
        .btn-icon {
            background: none;
            border: 1px solid var(--glass-border);
            color: var(--text-secondary);
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 0.5rem;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-icon:hover {
            border-color: var(--primary);
            color: var(--primary);
        }
        .btn-icon.delete:hover {
            border-color: #ef4444;
            color: #ef4444;
            background: rgba(239, 68, 68, 0.1);
        }
        .icon-spin {
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .event-cover-img {
            width: 100%;
            height: 160px;
            object-fit: cover;
            display: block;
        }
        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .page-header .page-title {
            margin-bottom: 0;
        }
        .header-left {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 1.5rem;
        }
        .btn-new-event {
            white-space: nowrap;
        }
        .events-date-filters {
            display: flex;
            align-items: flex-end;
            gap: 1rem;
            background: rgba(255, 255, 255, 0.03);
            padding: 0.75rem 1.25rem;
            border-radius: 1rem;
            border: 1px solid var(--glass-border);
        }
        .date-filter-item {
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
        }
        .date-filter-item label {
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-secondary);
            font-weight: 700;
        }
        .date-filter-item .input-field {
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
            width: 140px;
            background: rgba(0, 0, 0, 0.2);
        }
        .btn-clear {
            padding: 0.4rem 1rem;
            font-size: 0.8rem;
            height: 34px;
            margin-bottom: 2px;
        }
        
        .event-card.event-type-club-official-meetup {
            background: linear-gradient(135deg, var(--primary-semi), var(--bg-card));
            border-left: 4px solid var(--primary);
        }
        .events-list-container {
            margin-top: 3rem;
            display: flex;
            flex-direction: column;
            gap: 4rem;
        }
        .events-section {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }
        .section-title {
            font-size: 1.25rem;
            color: var(--text-primary);
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .section-title::after {
            content: '';
            flex: 1;
            height: 1px;
            background: linear-gradient(to right, var(--glass-border), transparent);
        }
        .section-title-past {
            color: var(--text-secondary);
            opacity: 0.8;
        }
        .no-events-hint {
            padding: 3rem;
            text-align: center;
            background: rgba(255,255,255,0.02);
            border-radius: 1rem;
            border: 2px dashed var(--glass-border);
            color: var(--text-secondary);
            font-style: italic;
        }
        .events-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 1.25rem;
        }
        .event-card-wrapper {
            transition: transform 0.2s ease;
            height: 100%;
        }
        .event-card-wrapper:hover {
            transform: translateY(-4px);
        }
        .event-card {
            background: var(--bg-card);
            border-radius: 1.25rem;
            border: 1px solid var(--glass-border);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            position: relative;
            width: 100%;
            height: 100%;
        }
        .event-card-wrapper:hover .event-card {
            border-color: var(--primary);
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .event-card-content {
            display: flex;
            padding: 1.25rem;
            gap: 1rem;
            flex: 1;
        }
        .event-date {
            min-width: 60px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            background: rgba(255, 255, 255, 0.05);
            padding: 0.5rem;
            border-radius: 0.75rem;
            border: 1px solid var(--glass-border);
            height: fit-content;
        }
        .month {
            text-transform: uppercase;
            font-size: 0.7rem;
            color: var(--accent);
            letter-spacing: 0.1em;
            font-weight: 700;
        }
        .day {
            font-size: 1.75rem;
            font-weight: 800;
            color: var(--text-primary);
            line-height: 1.1;
            margin: 0.2rem 0;
        }
        .year {
            font-size: 0.75rem;
            color: var(--text-secondary);
            opacity: 0.7;
        }
        .time {
            margin-top: 0.75rem;
            padding-top: 0.5rem;
            border-top: 1px solid var(--glass-border);
            font-size: 0.8rem;
            font-weight: 700;
            color: var(--primary);
            width: 100%;
            text-align: center;
        }
        .event-body {
            flex: 1;
        }
        .event-info-header {
            margin-bottom: 0.75rem;
        }
        .title-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 1.5rem;
            width: 100%;
        }
        .event-body h2 {
            flex: 1;
            font-size: 1.25rem;
            font-weight: 700;
            margin: 0;
            line-height: 1.2;
            word-break: break-word;
        }
        .visibility-badge {
            font-size: 0.9rem;
            opacity: 0.6;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: rgba(255,255,255,0.05);
            width: 30px;
            height: 30px;
        }
        .visibility-badge.public { color: #10b981; }
        .visibility-badge.private { color: #3b82f6; }

        .type-badge {
            font-size: 0.65rem;
            padding: 0.25rem 0.75rem;
            border-radius: 2rem;
            text-transform: uppercase;
            font-weight: 800;
            white-space: nowrap;
            letter-spacing: 0.05em;
            background: rgba(255, 255, 255, 0.1);
            color: var(--text-secondary);
            border: 1px solid var(--glass-border);
        }
        /* Badge Colors */
        .type-badge.soft-trail { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
        .type-badge.hard-trail { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
        .type-badge.members-meetup { background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); }
        .type-badge.club-official-meetup { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }

        .event-meta {
            color: var(--text-secondary);
            font-size: 0.9rem;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }
        .event-desc {
            color: var(--text-secondary);
            line-height: 1.5;
            margin-bottom: 1rem;
            font-size: 0.9rem;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        .attendees-section {
            display: flex;
            flex-direction: column;
            padding-top: 1rem;
            border-top: 1px solid var(--glass-border);
        }
        .attendees-label {
            font-size: 0.75rem;
            color: var(--text-secondary);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .attendee-list {
            display: flex;
            flex-wrap: wrap;
            gap: -0.5rem; /* Overlap effect */
        }
        .attendee-chip {
            margin-right: -0.5rem;
            transition: transform 0.2s;
            cursor: help;
        }
        .attendee-chip:hover {
            transform: translateY(-2px);
            z-index: 10;
        }
        .attendee-avatar {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 2px solid var(--bg-card);
            background: var(--bg-dark);
            object-fit: cover;
        }
        .no-attendees {
            font-size: 0.8rem;
            color: var(--text-secondary);
            font-style: italic;
            opacity: 0.7;
        }

        .event-footer-actions {
            display: flex;
            flex-wrap: wrap;
            border-top: 1px solid var(--glass-border);
            background: rgba(0,0,0,0.1);
        }
        .action-btn {
            flex: 1;
            min-width: 45%;
            padding: 0.65rem;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            font-weight: 600;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.4rem;
        }
        .action-btn:hover {
            background: rgba(255,255,255,0.05);
            color: var(--text-primary);
        }
        .action-btn:not(:last-child) {
            border-right: 1px solid var(--glass-border);
        }
        .action-btn {
            border-top: 1px solid var(--glass-border);
        }
        .event-footer-actions .action-btn:first-child,
        .event-footer-actions .action-btn:nth-child(2) {
            border-top: none;
        }
        
        .join-btn {
            flex: 2;
            background: var(--primary-glow);
            color: var(--primary);
        }
        .join-btn:hover {
            background: var(--primary);
            color: white;
        }
        .join-btn.attending {
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
        }
        .join-btn.attending:hover {
            background: #ef4444;
            color: white;
        }
        .join-btn.disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background: rgba(255,255,255,0.05);
            color: var(--text-secondary);
        }
        
        .view-attendees-btn:hover { color: var(--primary); }
        .gallery-btn:hover { color: var(--accent); }
        .edit-btn:hover { color: var(--accent); }
        .delete-event-btn:hover { color: var(--danger); }

        @media (max-width: 640px) {
            .event-card-content {
                flex-direction: column;
                padding: 1rem;
            }
            .event-date {
                flex-direction: row;
                width: 100%;
                justify-content: center;
                gap: 1rem;
                padding: 0.5rem;
            }
            .time {
                border-top: none;
                border-left: 1px solid var(--glass-border);
                margin-top: 0;
                padding-top: 0;
                padding-left: 1rem;
                width: auto;
            }
            .header-left {
                flex-direction: column;
                align-items: flex-start;
                gap: 1rem;
                width: 100%;
            }
            .events-date-filters {
                width: 100%;
                flex-wrap: wrap;
                padding: 1rem;
            }
            .date-filter-item {
                flex: 1;
                min-width: 120px;
            }
            .date-filter-item .input-field {
                width: 100%;
            }
            .btn-new-event {
                width: 100%;
                margin-top: 1rem;
            }
            .btn-clear {
                width: 100%;
            }
            .event-body h2 {
                font-size: 1.25rem;
            }
            .action-btn {
                padding: 0.75rem;
                font-size: 0.8rem;
            }
            .modal-content {
                max-width: 90vw;
            }
            .form-row {
                grid-template-columns: 1fr;
            }
        }
      `}</style>
        </div>
    );
};

export default Events;
