const fetchFromDatabase = async (
    url,
    method = 'GET',
    headers = {},
    credentials = 'same-origin',
    body = null
) => {
    try {
        let safeHeaders = {}

        if (typeof headers === 'string') {
            safeHeaders['Content-Type'] = headers
        } else {
            safeHeaders = Object.assign({}, headers)
        }

        if (body && !safeHeaders['Content-Type']) {
            safeHeaders['Content-Type'] = 'application/json'
        }

        const options = {
            method,
            headers: safeHeaders,
            credentials
        }

        if (body) options.body = JSON.stringify(body)

        const data = await fetch(url, options)

        if (!data.ok) {
            const errorData = await data.json().catch(() => ({}))
            if (!errorData.message) {
                errorData.message =
                    `HTTP ${data.status}: ${data.statusText}`
            }
            return errorData
        }

        return await data.json()
    } catch (error) {
        console.error('Error:', error.message)
        return null
    }
}

export default fetchFromDatabase
