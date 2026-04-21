/**
 * Formats a number to a string with a maximum of one decimal place,
 * using a comma as the decimal separator (es-CO locale).
 * @param {number|string} num 
 * @returns {string}
 */
export const formatQty = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Number(num).toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
    });
};

/**
 * Formats a currency/price value with thousands separators and no decimals.
 * @param {number|string} num 
 * @returns {string}
 */
export const formatPrice = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Number(num).toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
};

/**
 * Formats a number to exactly 1 decimal place if it has decimals, or none if it's an integer.
 * But according to user: "máximo un dígito decimal".
 * So formatQty above is perfect.
 */
