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
        const d = new Date(date);
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
        const d = new Date(date);
        if (isNaN(d.getTime())) return String(date);
        return d.toLocaleString(getLocale(lang));
    } catch (e) {
        return String(date);
    }
};
