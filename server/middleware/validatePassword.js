import passwordValidator from 'password-validator';

const schema = new passwordValidator();
schema
  .is().min(8)
  .is().max(100)
  .has().uppercase()
  .has().lowercase()
  .has().digits(1)
  .has().symbols(1)
  .has().not().spaces();

export const validatePassword = (req, res, next) => {
  if (!schema.validate(req.body.password)) {
    return res.status(400).json({
      error: 'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character'
    });
  }
  next();
}; 