import crypto from 'crypto';
import dbConnection from '../db/dbConnection.js';
import validateUser from '../util/validateUser.js';
import validateSession from '../util/validateSession.js';
import emailTransporter from '../util/emailTransporter.js';
import verificationEmail from '../templates/verificationEmail.js';
import emailChangeEmail from '../templates/emailChangeEmail.js';

const appName = process.env.APP_NAME;
const emailUser = process.env.EMAIL_USER;
const frontEndUrl = process.env.FRONT_END_URL;

if (!appName) throw new Error('APP_NAME not defined in .env');
if (!emailUser) throw new Error('EMAIL_USER not defined in .env');
if (!frontEndUrl) throw new Error('FRONT_END_URL not defined in .env');

const readUsers = async (request, response) => {
  await dbConnection.executeQuerySendResponse(
    response,
    'SELECT',
    'SELECT * FROM users;',
  );
};

const readUser = async (request, response) => {
  await dbConnection.executeQuerySendResponse(
    response,
    'SELECT',
    'SELECT * FROM users WHERE id = ?;',
    [request.params.id],
  );
};

const createUser = async (request, response) => {
  const validationResult = await validateUser(request, response);

  if (!validationResult.valid) return null;

  const sqlResult = await dbConnection.executeQuery(
    `INSERT INTO users (username, email, password, role)
      VALUES (?, ?, ?, ?);`,
    validationResult.queryParams,
  );

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const tokenExpires = new Date(Date.now() + 60 * 60 * 1000);

  await dbConnection.executeQuery(
    `INSERT INTO user_tokens (
      user_id,
      token_type,
      token_value,
      expires_at
    ) VALUES (?, 'account_verification', ?, ?)
    ON DUPLICATE KEY UPDATE
      token_value = VALUES(token_value),
      expires_at = VALUES(expires_at),
      created_at = CURRENT_TIMESTAMP,
      used_at = NULL;`,
    [sqlResult.insertId, verificationToken, tokenExpires],
  );

  const verificationLink =
    `${frontEndUrl}/verify-email?token=${verificationToken}`;
  const emailContent = verificationEmail(
    request.body.username,
    verificationLink,
  );

  await emailTransporter.sendMail({
    from: emailUser,
    to: request.body.email,
    subject: `Please confirm your email address for ${appName}`,
    html: emailContent,
  });

  return response.status(201).json({
    message: 'Registered successfully — please check your email to confirm',
  });
};

const updateUser = async (request, response) => {
  validateSession(request, request.body.id);

  const validationResult = await validateUser(
    request,
    response,
    request.body.id,
  );

  if (!validationResult.valid) return null;

  const sqlResult = await dbConnection.executeQuery(
    `SELECT
      u.id,
      u.username,
      u.email,
      ut.token_value AS email_change_token, 
      ut.expires_at AS token_expires
    FROM users u
    LEFT JOIN user_tokens ut 
      ON u.id = ut.user_id AND ut.token_type = 'email_change'
    WHERE u.id = ?`,
    [request.body.id],
  );

  if (sqlResult.length === 0) {
    return response.status(404).json({ message: 'User not found' });
  }

  if (request.body.email !== sqlResult[0].email) {
    const emailChangeToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 60 * 60 * 1000);

    await dbConnection.executeQuery(
      `INSERT INTO user_tokens 
        (user_id, token_type, token_value, expires_at)
      VALUES 
        (?, 'email_change', ?, ?)
      ON DUPLICATE KEY UPDATE
        token_value = VALUES(token_value),
        expires_at = VALUES(expires_at),
        created_at = CURRENT_TIMESTAMP,
        used_at = NULL;`,
      [request.body.id, emailChangeToken, tokenExpires],
    );

    const changeEmailLink =
      `${frontEndUrl}/change-email?token=${emailChangeToken}`;
    const emailContent = emailChangeEmail(
      request.body.username || sqlResult[0].username,
      changeEmailLink,
    );

    await emailTransporter.sendMail({
      from: emailUser,
      to: request.body.email,
      subject: `Confirm your email address change for ${appName}`,
      html: emailContent,
    });
  }

  await dbConnection.executeQuery(
    `UPDATE users
    SET ${validationResult.queryFields.join(', ')}
    WHERE id = ?;`,
    validationResult.queryParams,
  );

  let mainSuccessMessage = 'User updated successfully';

  if (request.body.email !== sqlResult[0].email) {
    mainSuccessMessage = mainSuccessMessage.concat(
      ' — check email to confirm email change',
    );
  }

  const updatedUserArray = await dbConnection.executeQuery(
    `SELECT
      id,
      username,
      email,
      role,
      account_verified,
      totp_auth_on,
      created_at
    FROM users
    WHERE id = ?;`,
    [request.body.id],
  );

  return response.status(200).json({
    message: mainSuccessMessage,
    successfulUpdates: validationResult.successfulUpdates,
    user: updatedUserArray[0],
  });
};

const deleteUser = async (request, response) => {
  const sqlResult = await dbConnection.executeQuery(
    `SELECT u.id, ut.expires_at
    FROM users u
    JOIN user_tokens ut
      ON ut.user_id = u.id
    WHERE ut.token_type = 'account_deletion'
      AND ut.token_value = ?;`,
    [request.query.token],
  );

  if (
    sqlResult.length === 0 ||
    new Date(sqlResult[0].expires_at) < new Date()
  ) {
    return response.status(400).json({
      message: 'Invalid or expired token',
    });
  }

  await dbConnection.executeQuery(
    `UPDATE user_tokens
    SET used_at = CURRENT_TIMESTAMP
    WHERE token_value = ?
      AND token_type = 'account_deletion';`,
    [request.query.token],
  );

  await dbConnection.executeQuery('DELETE FROM users WHERE id = ?;', [
    sqlResult[0].id,
  ]);

  return response.status(200).json({
    message: 'Account deleted successfully',
  });
};

export default { readUsers, readUser, createUser, updateUser, deleteUser };
