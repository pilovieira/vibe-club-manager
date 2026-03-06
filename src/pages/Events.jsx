import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockService } from '../services/mockData';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { FaImages } from 'react-icons/fa';
import { parseSafeDate } from '../utils/dateUtils';

const Events = () => {
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const { t, language } = useLanguage();
    const [events, setEvents] = useState([]);
    const [members, setMembers] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);

    // Create Event State
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingEventId, setEditingEventId] = useState(null);
    const [newEvent, setNewEvent] = useState({ title: '', date: '', location: '', description: '', eventType: 'soft trail' });
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

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
                setNewEvent({ title: '', date: '', location: '', description: '', eventType: 'soft trail' });

                // Log operation
                await mockService.createLog({
                    userId: user.id || user.uid,
                    userName: user.name || user.displayName || user.email,
                    description: `${editingEventId ? 'Updated' : 'Created'} event: ${newEvent.title}`
                });
            } catch (err) {
                console.error('Error creating/updating event:', err);
            }
        };
        createOrUpdateEventAsync();
    };

    const handleStartEdit = (event) => {
        setEditingEventId(event.id);
        setNewEvent({
            title: event.title,
            date: event.date,
            location: event.location,
            description: event.description,
            eventType: event.eventType || 'soft trail'
        });
        setShowCreateForm(true);
    };

    const handleToggleEvent = (eventId) => {
        if (!user) return;

        const event = events.find(e => e.id === eventId);
        const eventDate = parseSafeDate(event.date);
        const isPast = eventDate < new Date();

        if (isPast) {
            alert(t('events.ended'));
            return;
        }

        const attending = event.attendees.includes(user.id);

        const toggleEventAsync = async () => {
            try {
                if (attending) {
                    // Leave Event
                    if (confirm(t('events.confirmLeave') || "Are you sure you want to leave this event?")) {
                        await mockService.leaveEvent(eventId, user.id);
                        await fetchEventsAndMembers(); // Refresh after action

                        // Log operation
                        await mockService.createLog({
                            userId: user.id || user.uid,
                            userName: user.name || user.displayName || user.email,
                            description: `Left event: ${event.title}`
                        });
                    }
                } else {
                    // Join Event
                    if (user.status === 'inactive') {
                        alert(t('events.inactiveWarning'));
                        return;
                    }
                    await mockService.joinEvent(eventId, user.id);
                    await fetchEventsAndMembers(); // Refresh after action

                    // Log operation
                    await mockService.createLog({
                        userId: user.id || user.uid,
                        userName: user.name || user.displayName || user.email,
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

    const renderEventCard = (event) => (
        <div key={event.id} className="event-card-wrapper animate-fade-in">
            <div className={`event-card shadow-sm event-type-${(event.eventType || '').replace(/\s+/g, '-')}`}>
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
                            <h2>{event.title}</h2>
                            <div className="event-badge-row">
                                <span className={`type-badge ${(event.eventType || 'soft trail').replace(/\s+/g, '-')}`}>
                                    {t(`events.type.${(event.eventType || 'soft-trail').replace(/\s+/g, '-')}`)}
                                </span>
                            </div>
                        </div>
                        <p className="event-meta">📍 {event.location}</p>
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
                    ) : (
                        <button className="action-btn join-btn disabled" disabled>{t('nav.login')}</button>
                    )}

                    {user && (
                        <button
                            className="action-btn gallery-btn"
                            onClick={() => navigate(`/events/${event.id}/gallery`)}
                        >
                            <FaImages /> <span>{t('events.gallery')}</span>
                        </button>
                    )}

                    {(isAdmin || (user && event.createdBy === (user.id || user.uid))) && (
                        <button
                            className="action-btn edit-btn"
                            onClick={() => handleStartEdit(event)}
                        >
                            <span>✏️ {t('common.edit')}</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    const filteredEvents = events.filter(event => {
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
                        <div className="form-row">
                            <div className="form-group">
                                <label>{t('events.date')}</label>
                                <input type="datetime-local" className="input-field" value={newEvent.date} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>{t('events.location')}</label>
                                <input className="input-field" value={newEvent.location} onChange={e => setNewEvent({ ...newEvent, location: e.target.value })} required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>{t('events.type')}</label>
                            <select
                                className="input-field"
                                value={newEvent.eventType}
                                onChange={e => setNewEvent({ ...newEvent, eventType: e.target.value })}
                                required
                            >
                                <option value="soft trail">{t('events.type.soft-trail')}</option>
                                <option value="hard trail">{t('events.type.hard-trail')}</option>
                                <option value="members meetup">{t('events.type.members-meetup')}</option>
                                {isAdmin && <option value="club official meetup">{t('events.type.club-official-meetup')}</option>}
                            </select>
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

            <style>{`
        .create-event-form {
            max-width: 600px;
            margin-bottom: 2rem;
        }
        .form-group {
            margin-bottom: 1rem;
        }
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            color: var(--text-secondary);
        }
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }
        .header-left {
            display: flex;
            align-items: center;
            gap: 2rem;
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
        
        .events-list {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }
        .event-card {
            display: flex;
            align-items: flex-start;
            gap: 2rem;
            padding: 2rem;
            transition: transform 0.3s ease, border-color 0.3s ease;
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
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }
        .event-card-wrapper {
            transition: transform 0.2s ease;
        }
        .event-card-wrapper:hover {
            transform: translateY(-4px);
        }
        .event-card {
            background: var(--bg-card);
            border-radius: 1rem;
            border: 1px solid var(--glass-border);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            position: relative;
        }
        .event-card-wrapper:hover .event-card {
            border-color: var(--primary);
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .event-card-content {
            display: flex;
            padding: 1.5rem;
            gap: 1.5rem;
        }
        .event-date {
            min-width: 80px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            background: rgba(255, 255, 255, 0.05);
            padding: 0.75rem;
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
        .event-badge-row {
            margin-top: 0.25rem;
        }
        .event-body h2 {
            font-size: 1.5rem;
            font-weight: 700;
            margin: 0;
            line-height: 1.2;
        }
        .type-badge {
            font-size: 0.65rem;
            padding: 0.25rem 0.75rem;
            border-radius: 2rem;
            text-transform: uppercase;
            font-weight: 800;
            white-space: nowrap;
            letter-spacing: 0.05em;
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
            margin-bottom: 1.5rem;
            font-size: 0.95rem;
        }
        .attendees-section {
            display: flex;
            align-items: center;
            gap: 1rem;
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
            border-top: 1px solid var(--glass-border);
            background: rgba(0,0,0,0.1);
        }
        .action-btn {
            flex: 1;
            padding: 1rem;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            font-weight: 600;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }
        .action-btn:hover {
            background: rgba(255,255,255,0.05);
            color: var(--text-primary);
        }
        .action-btn:not(:last-child) {
            border-right: 1px solid var(--glass-border);
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
        
        .gallery-btn:hover { color: var(--accent); }
        .edit-btn:hover { color: var(--accent); }

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
            .attendees-section {
                flex-direction: column;
                align-items: flex-start;
                gap: 0.75rem;
            }
            .action-btn {
                padding: 0.75rem;
                font-size: 0.8rem;
            }
        }
      `}</style>
        </div>
    );
};

export default Events;
