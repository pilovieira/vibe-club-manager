import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../context/LanguageContext';

// Leaflet's default marker icon references image files that Vite doesn't bundle
// automatically; point it at the CDN copies instead of shipping broken markers.
const markerIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Maringá, PR — sensible default center when the event has no coordinates yet.
const DEFAULT_CENTER = [-23.4205, -51.9333];

const ClickHandler = ({ onPick }) => {
    useMapEvents({
        click(e) {
            onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
    });
    return null;
};

/**
 * Modal map picker: click anywhere to drop/move a pin, then confirm to
 * return { lat, lng } to the caller. No API key required (OpenStreetMap tiles).
 */
const MapLocationPicker = ({ initialPosition, onConfirm, onClose }) => {
    const { t } = useLanguage();
    const [position, setPosition] = useState(initialPosition || null);

    return (
        <div className="map-picker-overlay" onClick={onClose}>
            <div className="map-picker-modal" onClick={e => e.stopPropagation()}>
                <div className="map-picker-header">
                    <h3>{t('events.pickLocation')}</h3>
                    <button type="button" className="map-picker-close" onClick={onClose}>&times;</button>
                </div>
                <p className="map-picker-hint">{t('events.pickLocationHint')}</p>
                <div className="map-picker-map">
                    <MapContainer
                        center={position ? [position.lat, position.lng] : DEFAULT_CENTER}
                        zoom={position ? 15 : 13}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <ClickHandler onPick={setPosition} />
                        {position && <Marker position={[position.lat, position.lng]} icon={markerIcon} />}
                    </MapContainer>
                </div>
                <div className="map-picker-actions">
                    {position && (
                        <button type="button" className="btn btn-outline" onClick={() => setPosition(null)}>
                            {t('events.clearLocation')}
                        </button>
                    )}
                    <button type="button" className="btn btn-outline" onClick={onClose}>
                        {t('contributions.cancel')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={!position}
                        onClick={() => onConfirm(position)}
                    >
                        {t('events.confirmLocation')}
                    </button>
                </div>
            </div>

            <style>{`
                .map-picker-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 1rem;
                }
                .map-picker-modal {
                    background: var(--bg-card, #1c1916);
                    border: 1px solid var(--glass-border);
                    border-radius: 1rem;
                    width: 100%;
                    max-width: 600px;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                .map-picker-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .map-picker-header h3 {
                    margin: 0;
                }
                .map-picker-close {
                    background: none;
                    border: none;
                    color: var(--text-primary);
                    font-size: 1.5rem;
                    line-height: 1;
                    cursor: pointer;
                }
                .map-picker-hint {
                    margin: 0;
                    color: var(--text-secondary);
                    font-size: 0.85rem;
                }
                .map-picker-map {
                    height: 350px;
                    border-radius: 0.5rem;
                    overflow: hidden;
                    border: 1px solid var(--glass-border);
                }
                .map-picker-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                }
            `}</style>
        </div>
    );
};

export default MapLocationPicker;
