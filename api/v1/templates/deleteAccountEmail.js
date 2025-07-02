const deleteAccountEmail = (username, deleteAccountLink) => `
  <!DOCTYPE html>
  <html>
    <body>
      <h2>Account deletion requested</h2>
      <p>
        Hello ${username},
      </p>
      <p>
        We received a request to delete your account with
        ${process.env.APP_NAME}. If you wish to proceed with the account
        deletion, please click this link:
      </p>
      <p>
        <a href="${deleteAccountLink}">Confirm account deletion</a>
      </p>
      <p>
        If the link doesn't work, copy and paste this URL into your browser:
      </p>
      <p>
        ${deleteAccountLink}
      </p>
      <p>
        We thank you for using the app and wish you the best.
      <p>
      <p>
        If you did not request this, you can safely ignore this email.
      </p>
    </body>
  </html>
`;

export default deleteAccountEmail;
