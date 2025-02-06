import { cleanEnv, str, port } from 'envalid';

export const validateEnv = () => {
  cleanEnv(process.env, {
    PORT: port(),
    MONGODB_URI: str(),
    JWT_SECRET: str(),
    REFRESH_TOKEN_SECRET: str(),
    CLIENT_URL: str(),
    EMAIL_USER: str(),
    EMAIL_PASS: str()
  });
}; 