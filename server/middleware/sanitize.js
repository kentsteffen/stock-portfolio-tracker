import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';

export const sanitizeMiddleware = [
  // Remove $ and . from request bodies (prevents NoSQL injection)
  mongoSanitize(),
  // Sanitize request data (prevents XSS)
  xss()
]; 