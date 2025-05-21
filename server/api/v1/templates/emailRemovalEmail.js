const emailRemovalEmail = () => `
    <!DOCTYPE html>
    <html>
        <body>
            <h2>Email address removed</h2>
            <p>
                Hello,
            </p>
            <p>
                You're receiving this message because this email
                address was recently removed from an account with
                ${process.env.APP_NAME}.
            </p>
            <p>
                If you made this change, no further action is needed.
            </p>
            <p>
                If you did *not* make this change, your account may have been
                updated without your knowledge. Please contact
                ${process.env.EMAIL_CONTACT}.
            </p>
        </body>
    </html>
`

export default emailRemovalEmail
