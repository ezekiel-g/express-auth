const passwordResetEmail = (username, resetLink) => `
    <!DOCTYPE html>
    <html>
        <body>
            <h2>Password reset requested</h2>
            <p>
                Hi ${username}, we received a request to reset your password.
                You can reset your password by clicking this link:
            </p>
            <p>
                <a href="${resetLink}">Reset your password</a>
            </p>
            <p>
                If the link doesn't work, copy and paste this URL into your
                browser:
            </p>
            <p>
                ${resetLink}
            </p>
            <p>
                If you did not request this, you can safely ignore this email.
            </p>
        </body>
    </html>
`

export default passwordResetEmail
