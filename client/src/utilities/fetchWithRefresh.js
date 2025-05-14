const backEndUrl = import.meta.env.VITE_BACK_END_URL

const fetchWithRefresh = async (endpoint, options = {}) => {
    const response = await fetch(`${backEndUrl}${endpoint}`, {
        method: options.method || 'GET',
        headers: options.headers || {},
        body: options.body || null,
        credentials: 'include'
    })

    if (response.status !== 401) return response

    const refreshResponse = await fetch(
        `${backEndUrl}/api/v1/sessions/refresh`,
        {
            method: 'POST',
            credentials: 'include'
        }
    )

    if (!refreshResponse.ok) {
        window.location.href = '/sign-in'
        throw new Error('Session expired')
    }

    return fetch(`${backEndUrl}${endpoint}`, {
        method: options.method || 'GET',
        headers: options.headers || {},
        body: options.body || null,
        credentials: 'include'
    })
}

export default fetchWithRefresh
