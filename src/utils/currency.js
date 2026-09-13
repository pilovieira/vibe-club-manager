/**
 * Formats a number as Brazilian Real currency (e.g. "R$ 1.234,56").
 * @param {number} value
 * @returns {string}
 */
export const formatCurrency = (value) => {
    const number = Number(value) || 0;
    return number.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
};
