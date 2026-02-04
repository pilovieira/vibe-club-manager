import { useState, useEffect } from 'react';
import { mockService } from '../services/mockData';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const Events = () => {
    const { user, isAdmin } = useAuth();
    const { t } = useLanguage();
    const [events, setEvents] = useState([]);
    const [members, setMembers] = useState([]);

    // Create Event State
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingEventId, setEditingEventId] = useState(null);
    const [newEvent, setNewEvent] = useState({ title: '', date: '', location: '', description: '', eventType: 'soft trail' });
    const [showPastEvents, setShowPastEvents] = useState(false);

    useEffect(() => {
        const fetchEventsAndMembers = async () => {
            try {
                const fetchedEvents = await mockService.getEvents();
                // Sort oldest first (chronological)
                const sortedEvents = [...fetchedEvents].sort((a, b) => new Date(a.date) - new Date(b.date));
                setEvents(sortedEvents);
                const fetchedMembers = await mockService.getMembers();
                setMembers(fetchedMembers);
            } catch (err) {
                console.error('Error fetching events/members:', err);
            }
        };
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
                    const created = await mockService.createEvent(newEvent);
                    setEvents([created, ...events]);
                }
                setShowCreateForm(false);
                setEditingEventId(null);
                setNewEvent({ title: '', date: '', location: '', description: '', eventType: 'soft trail' });
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
        const eventDate = new Date(event.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Only compare dates, not time

        const isPast = eventDate < today;
        const attending = event.attendees.includes(user.id);

        if (isPast && !attending) {
            alert(t('events.ended'));
            return;
        }

        const toggleEventAsync = async () => {
            try {
                if (attending) {
                    // Leave Event
                    if (confirm("Are you sure you want to leave this event?")) {
                        const updatedEvent = await mockService.leaveEvent(eventId, user.id);
                        if (updatedEvent) {
                            setEvents(events.map(e => e.id === eventId ? updatedEvent : e));
                        }
                    }
                } else {
                    // Join Event
                    if (user.status === 'inactive') {
                        alert(t('events.inactiveWarning'));
                        return;
                    }
                    const updatedEvent = await mockService.joinEvent(eventId, user.id);
                    if (updatedEvent) {
                        setEvents(events.map(e => e.id === eventId ? updatedEvent : e));
                    }
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

    const filteredEvents = events.filter(event => {
        if (showPastEvents) return true;
        const eventDate = new Date(event.date + 'T23:59:59'); // Include the full day
        return eventDate >= new Date();
    });

    return (
        <div className="container events-page">
            <header className="page-header">
                <div className="header-left">
                    <h1 className="page-title">{t('events.title')}</h1>
                    <label className="filter-toggle">
                        <input
                            type="checkbox"
                            checked={showPastEvents}
                            onChange={() => setShowPastEvents(!showPastEvents)}
                        />
                        <span>{t('events.showPastEvents')}</span>
                    </label>
                </div>
                {user && (
                    <button className="btn btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
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
                                <input type="date" className="input-field" value={newEvent.date} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} required />
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

            <div className="events-list">
                {filteredEvents.map(event => (
                    <div key={event.id} className={`event-card card event-type-${(event.eventType || '').replace(/\s+/g, '-')}`}>
                        <div className="event-date">
                            <span className="month">{new Date(event.date + 'T00:00:00').toLocaleString('default', { month: 'short' })}</span>
                            <span className="day">{new Date(event.date + 'T00:00:00').getDate()}</span>
                            <span className="year">{new Date(event.date + 'T00:00:00').getFullYear()}</span>
                        </div>
                        <div className="event-details">
                            <div className="event-header-row">
                                <h2>{event.title}</h2>
                                <span className={`type-badge ${(event.eventType || 'soft trail').replace(/\s+/g, '-')}`}>
                                    {t(`events.type.${(event.eventType || 'soft-trail').replace(/\s+/g, '-')}`)}
                                </span>
                            </div>
                            <p className="event-meta">📍 {event.location}</p>
                            <p className="event-desc">{event.description}</p>

                            <div className="attendees-section">
                                <span className="attendees-label">{t('events.attendees')} ({event.attendees.length}):</span>
                                <div className="attendee-list">
                                    {event.attendees.length === 0 && <span className="text-secondary small">Be the first to join!</span>}
                                    {getAttendeeDetails(event.attendees).map(member => (
                                        <div key={member.id} className="attendee-chip">
                                            <img
                                                src={member.avatar}
                                                alt={member.name}
                                                className="attendee-avatar"
                                            />
                                            <span className="attendee-name">{member.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="event-action">
                            <div className="action-stack">
                                {user ? (
                                    <button
                                        className={`btn ${isAttending(event) ? 'btn-danger-outline' : 'btn-primary'}`}
                                        onClick={() => handleToggleEvent(event.id)}
                                        disabled={(!isAttending(event) && (user.status === 'inactive' || new Date(event.date + 'T23:59:59') < new Date()))}
                                    >
                                        {isAttending(event)
                                            ? t('events.leave')
                                            : (new Date(event.date + 'T23:59:59') < new Date()
                                                ? t('events.ended')
                                                : (user.status === 'inactive' ? t('events.inactiveWarning') : t('events.join')))}
                                    </button>
                                ) : (
                                    <span className="text-secondary">Login to Join</span>
                                )}

                                {isAdmin && new Date(event.date + 'T23:59:59') >= new Date() && (
                                    <button
                                        className="btn-edit-small"
                                        onClick={() => handleStartEdit(event)}
                                    >
                                        ✏️ {t('events.editButton')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
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
        .filter-toggle {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.9rem;
            color: var(--text-secondary);
            cursor: pointer;
            background: rgba(255, 255, 255, 0.05);
            padding: 0.4rem 0.8rem;
            border-radius: 2rem;
            border: 1px solid var(--glass-border);
            transition: all 0.2s;
        }
        .filter-toggle:hover {
            background: rgba(255, 255, 255, 0.1);
            color: var(--text-primary);
        }
        .filter-toggle input {
            cursor: pointer;
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
            background: linear-gradient(135deg, rgba(30, 64, 175, 0.4), var(--bg-card));
            border-left: 4px solid #3b82f6;
        }
        .event-card.event-type-hard-trail {
            background: linear-gradient(135deg, rgba(154, 52, 18, 0.4), var(--bg-card));
            border-left: 4px solid #f97316;
        }
        .event-card.event-type-soft-trail {
            background: linear-gradient(135deg, rgba(161, 98, 7, 0.4), var(--bg-card));
            border-left: 4px solid #eab308;
        }
        .event-card.event-type-members-meetup {
            background: linear-gradient(135deg, rgba(21, 128, 61, 0.4), var(--bg-card));
            border-left: 4px solid #22c55e;
        }

        .event-date {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: var(--bg-dark);
            padding: 1rem;
            border-radius: 0.5rem;
            min-width: 80px;
            border: 1px solid var(--glass-border);
        }
        .month {
            color: var(--accent);
            text-transform: uppercase;
            font-size: 0.875rem;
            font-weight: 700;
        }
        .day {
            font-size: 1.5rem;
            font-weight: 700;
        }
        .year {
            font-size: 0.75rem;
            color: var(--text-secondary);
            opacity: 0.8;
            margin-top: 0.25rem;
        }
        .event-details {
            flex: 1;
        }
        .event-details h2 {
            margin-bottom: 0.25rem;
        }
        .event-header-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 0.5rem;
        }
        .type-badge {
            font-size: 0.7rem;
            padding: 0.2rem 0.6rem;
            border-radius: 1rem;
            text-transform: uppercase;
            font-weight: 700;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .event-meta {
            color: var(--text-secondary);
            font-size: 0.9rem;
            margin-bottom: 1rem;
        }
        .event-desc {
            color: var(--text-primary);
            line-height: 1.6;
            margin-bottom: 1.5rem;
        }
        .attendees-section {
            background: rgba(255,255,255,0.03);
            padding: 1rem;
            border-radius: 0.5rem;
        }
        .attendees-label {
            display: block;
            font-size: 0.85rem;
            color: var(--text-secondary);
            margin-bottom: 0.5rem;
            font-weight: 600;
        }
        .attendee-list {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
        }
        .attendee-chip {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(255,255,255,0.05);
            padding: 0.25rem 0.75rem 0.25rem 0.25rem;
            border-radius: 2rem;
            border: 1px solid var(--glass-border);
            font-size: 0.85rem;
        }
        .attendee-avatar {
            width: 24px;
            height: 24px;
            border-radius: 50%;
        }
        .attendee-name {
            color: var(--text-primary);
            font-weight: 500;
        }
        
        @media (max-width: 768px) {
            .event-card {
                flex-direction: column;
                align-items: flex-start;
                gap: 1rem;
            }
            .event-action {
                width: 100%;
                text-align: right;
            }
        }
        
        .action-stack {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            align-items: flex-end;
        }
        
        .btn-edit-small {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--glass-border);
            color: var(--text-secondary);
            padding: 0.4rem 0.8rem;
            border-radius: 0.375rem;
            cursor: pointer;
            font-size: 0.75rem;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }
        
        .btn-edit-small:hover {
            background: rgba(255, 255, 255, 0.1);
            color: var(--accent);
            border-color: var(--accent);
        }

        .btn-danger-outline {
            background: transparent;
            border: 1px solid var(--danger);
            color: var(--danger);
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
        }
        .btn-danger-outline:hover {
            background: rgba(239, 68, 68, 0.1);
        }
      `}</style>
        </div>
    );
};

export default Events;
