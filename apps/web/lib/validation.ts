export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email: string): boolean => EMAIL_REGEX.test(email.trim());
export const isValidPassword = (password: string): boolean => password.length >= 8;
export const isValidName = (name: string): boolean => name.trim().length >= 2;
export const isValidToken = (token: string): boolean => token.trim().length >= 3;
