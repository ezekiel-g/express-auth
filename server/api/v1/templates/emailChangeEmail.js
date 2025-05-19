const emailChangeEmail = (username, confirmationLink) => `
    <!DOCTYPE html>
    <html>
        <body>
            <h2>Email change requested</h2>
            <p>
                Hello ${username},
            </p>
            <p>
                We received a request to change the email address associated
                with your account. To confirm this change, please click this
                link:
            </p>
            <p>
                <a href="${confirmationLink}">Confirm email change</a>
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

export default emailChangeEmail
