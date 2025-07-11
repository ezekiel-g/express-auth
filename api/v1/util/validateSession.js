import jsonwebtoken from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET not defined in environment variables');
}

const validateSession = (request, expectedId = null) => {
  if (!request.cookies.accessToken) return null;

  try {
    const decryptedToken = jsonwebtoken.verify(
      request.cookies.accessToken,
      process.env.JWT_SECRET,
    );

    if (expectedId !== null) {
      if (String(decryptedToken.id) !== String(expectedId)) {
        const error = new Error('Unauthorized');
        error.status = 403;

        throw error;
      }

      return true;
    }

    return decryptedToken;
  } catch (error) {
    if (error instanceof jsonwebtoken.JsonWebTokenError) {
      const authError = new Error('Invalid or expired token');
      authError.status = 401;

      throw authError;
    }

    throw error;
  }
};

export default validateSession;
