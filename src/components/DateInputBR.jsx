import { useState, useEffect } from 'react';

const isoToBR = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return '';
    return `${d}/${m}/${y}`;
};

const digitsToBR = (digits) => {
    if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
};

const brToIso = (br) => {
    const match = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    const [, d, m, y] = match;
    // Reject impossible calendar dates (e.g. 31/02) rather than silently accepting them.
    const asDate = new Date(`${y}-${m}-${d}T00:00:00`);
    if (asDate.getFullYear() !== Number(y) || asDate.getMonth() + 1 !== Number(m) || asDate.getDate() !== Number(d)) {
        return null;
    }
    return `${y}-${m}-${d}`;
};

/**
 * Drop-in replacement for <input type="date">: same value/onChange contract
 * (ISO "yyyy-MM-dd" in and out), but always displays/accepts dd/mm/aaaa,
 * since native date inputs render in the browser's OS locale regardless of
 * the page's own language and can't be forced to pt-BR reliably.
 */
const DateInputBR = ({ value, onChange, className, required, id, min, max, placeholder = 'dd/mm/aaaa' }) => {
    const [text, setText] = useState(isoToBR(value));

    useEffect(() => {
        setText(isoToBR(value));
    }, [value]);

    const handleChange = (e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
        const formatted = digitsToBR(digits);
        setText(formatted);

        if (formatted === '') {
            onChange({ target: { value: '' } });
            return;
        }
        const iso = brToIso(formatted);
        if (!iso) return; // incomplete/invalid so far; keep typing without notifying parent
        if (min && iso < min) return;
        if (max && iso > max) return;
        onChange({ target: { value: iso } });
    };

    const handleBlur = () => {
        // If left incomplete/invalid, snap the visible text back to the last valid value.
        if (text !== '' && !brToIso(text)) {
            setText(isoToBR(value));
        }
    };

    return (
        <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className={className}
            value={text}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            maxLength={10}
            required={required}
            id={id}
        />
    );
};

export default DateInputBR;
