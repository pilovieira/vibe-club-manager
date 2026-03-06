/**
 * Parses a date string or object safely, avoiding timezone shifts
 * for date-only strings by setting them to midday.
 * @param {string|Date} date 
 * @returns {Date}
 */
export const parseSafeDate = (date) => {
    if (!date) return new Date();
    if (date instanceof Date) return date;

    if (typeof date === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return new Date(`${date}T12:00:00`);
        }
        if (!date.includes('T') && date.includes('-')) {
            // Might be a partial date, try to set to midday
            // but only if it's strictly a date pattern
            const parts = date.split('-');
            if (parts.length === 3) {
                return new Date(`${date}T12:00:00`);
            }
        }
    }
    return new Date(date);
};

/**
 * Maps app language to locale string
 * @param {string} lang 'en' or 'pt'
 * @returns {string} locale like 'en-US' or 'pt-BR'
 */
const getLocale = (lang) => {
    return lang === 'en' ? 'en-US' : 'pt-BR';
};

/**
 * Formats a date string or object to localized pattern
 * @param {string|Date} date 
 * @param {string} lang 'en' or 'pt'
 * @returns {string}
 */
export const formatDate = (date, lang = 'pt') => {
    if (!date) return '';
    try {
        const d = parseSafeDate(date);
        if (isNaN(d.getTime())) return String(date);
        return d.toLocaleDateString(getLocale(lang));
    } catch (e) {
        return String(date);
    }
};

/**
 * Formats a date string or object to localized pattern with time
 * @param {string|Date} date 
 * @param {string} lang 'en' or 'pt'
 * @returns {string}
 */
export const formatDateTime = (date, lang = 'pt') => {
    if (!date) return '';
    try {
        const d = parseSafeDate(date);
        if (isNaN(d.getTime())) return String(date);
        return d.toLocaleString(getLocale(lang));
    } catch (e) {
        return String(date);
    }
};

/**
 * Formats a date string or object to localized month and year
 * @param {string|Date} date 
 * @param {string} lang 'en' or 'pt'
 * @returns {string}
 */
export const formatMonthYear = (date, lang = 'pt') => {
    if (!date) return '';
    try {
        const d = parseSafeDate(date);
        if (isNaN(d.getTime())) return String(date);
        return d.toLocaleDateString(getLocale(lang), { month: 'short', year: 'numeric' });
    } catch (e) {
        return String(date);
    }
};
