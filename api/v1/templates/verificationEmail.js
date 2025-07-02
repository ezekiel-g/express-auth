const verificationEmail = (username, verificationLink) => `
  <!DOCTYPE html>
  <html>
    <body>
      <h2>Welcome to ${process.env.APP_NAME}, ${username}</h2>
      <p>
        Thank you for registering. Please verify your email address to complete
        your registration by clicking this link:
      </p>
      <p>
        <a href="${verificationLink}">Verify your email address</a>
      </p>
      <p>
        If the link doesn't work, copy and paste this URL into your browser:
      </p>
      <p>
        ${verificationLink}
      </p>
      <p>
        If you did not request this, you can safely ignore this email.
      </p>
    </body>
  </html>
`;

export default verificationEmail;
