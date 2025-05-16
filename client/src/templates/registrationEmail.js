const registrationEmail = (username, confirmationLink) => `
    <!DOCTYPE html>
    <html>
        <body>
            <h2>Welcome, ${username}</h2>
            <p>
                Thank you for registering. Please confirm your email address to
                complete your registration by clicking this link:
            </p>
            <p>
                <a href="${confirmationLink}">Confirm email address</a>
            </p>
            <p>
                If the link doesn't work, copy and paste this URL into your
                browser:
            </p>
            <p>
                ${confirmationLink}
            </p>
            <p>
                If you did not request this, you can safely ignore this email.
            </p>
        </body>
    </html>
`

export default registrationEmail
