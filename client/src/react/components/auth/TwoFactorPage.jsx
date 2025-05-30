import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useAuthContext from '../../contexts/auth/useAuthContext.js'
import fetchWithRefresh from '../../../util/fetchWithRefresh.js'
import messageUtility from '../../../util/messageUtility.jsx'

const TwoFactorPage = ({ backEndUrl }) => {
    const { user, setUser } = useAuthContext()
    const [totpAuthOn, setTotpAuthOn] = useState(undefined)
    const [qrCodeImage, setQrCodeImage] = useState(null)
    const [totpSecret, setTotpSecret] = useState(null)
    const [totpCode, setTotpCode] = useState('')
    const [successMessages, setSuccessMessages] = useState([])
    const [errorMessages, setErrorMessages] = useState([])
    const hasUpdatedUser = useRef(false)
    const navigate = useNavigate()
    const location = useLocation()

    const toggleTwoFactor = async () => {
        setSuccessMessages([])
        setErrorMessages([])
        
        const newTotpAuthOn = !totpAuthOn

        setTotpAuthOn(newTotpAuthOn)

        if (user.totp_auth_on) {
            navigate(
                '/confirm',
                { state: { confirmationType: 'turnOffTwoFactor' } }
            )
            return
        } else {
            if (!newTotpAuthOn) {
                setQrCodeImage(null)
                setTotpSecret(null)
            } else {
                const data = await fetchWithRefresh(
                    `${backEndUrl}/api/v1/verifications/get-totp-secret`,
                    'POST',
                    'application/json',
                    'include',
                    { id: user.id }
                )
                
                if (!data || typeof data !== 'object') {
                    setErrorMessages([
                        data?.message ||
                        'Error generating QR code'
                    ])
                    return
                }

                setQrCodeImage(data.qrCodeImage)
                setTotpSecret(data.totpSecret)
            }
        }
    }
    
    const handleChangeTotpSubmit = useCallback(async event => {
        if (event?.preventDefault) event.preventDefault()
        setErrorMessages([])

        const newTwoFactorSettings = !location.state?.confirmedTwoFactorOff
            ? { id: user.id, totpAuthOn: true, totpSecret, totpCode }
            : {
                id: user.id,
                totpAuthOn: false,
                totpSecret: null,
                totpCode: null
            }

        if (!location.state?.confirmedTwoFactorOff) {
            if (!totpSecret) {
                setErrorMessages(['2FA secret missing'])
                return
            }

            if (!totpCode || totpCode.length !== 6) {
                setErrorMessages([
                    'Please enter the 6-digit code from your authenticator app'
                ])
                return
            }
        }

        const data = await fetchWithRefresh(
            `${backEndUrl}/api/v1/verifications/set-totp-auth`,
            'PATCH',
            'application/json',
            'include',
            newTwoFactorSettings
        )

        if (!data || typeof data !== 'object') {
            setErrorMessages([data.message || 'Error updating 2FA'])
            return
        }


        const updatedUser = Object.assign({}, user, {
            totp_auth_on: newTwoFactorSettings.totpAuthOn
        })

        if (!hasUpdatedUser.current) {
            setUser(updatedUser)
            hasUpdatedUser.current = true
        }

        navigate('/settings', { replace: true })
    }, [
        location.state,
        totpCode,
        totpSecret,
        backEndUrl,
        user,
        setUser,
        navigate
    ])
     
    useEffect(() => {
        if (!user) {
            navigate('/sign-in')
            return
        } else {
            setTotpAuthOn(user.totp_auth_on === 0 ? false : true)
        }

        if (location.state?.confirmedTwoFactorOff) {
            handleChangeTotpSubmit()
        }
        if (
            user &&
            totpAuthOn === undefined &&
            user.totp_auth_on !== undefined
        ) {
            setTotpAuthOn(Boolean(user.totp_auth_on))
        }
    }, [user, totpAuthOn, navigate, location.state, handleChangeTotpSubmit])

    const successMessageDisplay =
        messageUtility.displaySuccessMessages(successMessages)
    const errorMessageDisplay =
        messageUtility.displayErrorMessages(errorMessages)
    let qrCodeDisplay = null

    if (qrCodeImage) {
        qrCodeDisplay =
            <div>
                <div htmlFor="qr-code-image" className="alert alert-danger rounded-0">
                        2FA not activated until QR code is scanned and 6-digit
                        code is entered
                </div>
                <div className="mb-3">
                    <label htmlFor="qr-code-image" className="form-label">
                        Scan this QR code with your authenticator app or enter
                        the code below manually:
                    </label>
                    <br />
                    <img
                        src={qrCodeImage}
                        alt="2FA QR Code"
                        className="my-3"
                        id="qr-code-image"
                        style={{ maxWidth: '200px' }}
                    />
                    <p>{totpSecret}</p>
                </div>
               
                <div className="mb-3">
                    <label htmlFor="totp-code" className="form-label">
                        6-digit code from your authenticator app:
                    </label>
                    <form onSubmit={handleChangeTotpSubmit}>
                        <input
                            type="text"
                            className="form-control text-center rounded-0 mb-3"
                            id="totp-code"
                            value={totpCode}
                            onChange={event => setTotpCode(event.target.value)}
                            maxLength="6"
                            placeholder="123456"
                            style={{ maxWidth: '200px' }}
                        />
                        <button
                            className="btn btn-primary rounded-0"
                            type="submit"
                        >
                            Submit
                        </button>
                    </form>
                </div>
            </div>
    }

    return (
        <div className="container mt-5 px-5">
            {successMessageDisplay}
            {errorMessageDisplay}
            <h2 className="mb-4">Two-Factor Authentication</h2>
            <div className="form-check form-switch my-3">
                <input
                    className="form-check-input"
                    type="checkbox"
                    id="toggle-2fa"
                    style={{ cursor: 'pointer' }}
                    checked={!!totpAuthOn}
                    onChange={toggleTwoFactor}
                />
                <label className="form-check-label" htmlFor="toggle-2fa">
                    2FA ON/OFF
                </label>
            </div>
            {qrCodeDisplay}

            <span onClick={() => navigate(-1)} style={{ cursor: 'pointer' }}>
                Back
            </span>
        </div>
    )
}

export default TwoFactorPage
