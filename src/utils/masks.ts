export const applyCpfMask = (value: string) => {
  return value
    .replace(/\D/g, '') // remove every non-number character
    .replace(/(\d{3})(\d)/, '$1.$2') // insert dot after 3rd digit
    .replace(/(\d{3})(\d)/, '$1.$2') // insert dot after 6th digit
    .replace(/(\d{3})(\d{1,2})/, '$1-$2') // insert dash after 9th digit
    .replace(/(-\d{2})\d+?$/, '$1'); // prevent typing more than 11 digits
};

export const applyPhoneMask = (value: string) => {
  return value
    .replace(/\D/g, '') // remove every non-number character
    .replace(/(\d{2})(\d)/, '($1) $2') // insert parentheses
    .replace(/(\d{4,5})(\d{4})/, '$1-$2') // insert dash
    .replace(/(-\d{4})\d+?$/, '$1'); // prevent typing after 11 digits
};

export const applyCroMask = (value: string) => {
  return value
    .toUpperCase()
    // Optional: remove non-alphanumeric and dashes, depending on strictness
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 15); // limit length
};
