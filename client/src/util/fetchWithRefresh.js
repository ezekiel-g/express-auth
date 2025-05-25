import fetchFromDatabase from './fetchFromDatabase.js'

const fetchWithRefresh = async (
    url,
    method = 'GET',
    headers = {},
    credentials = 'same-origin',
    body = null
) => {
    const data =
        await fetchFromDatabase(url, method, headers, credentials, body)

    if (data && data.status !== 401) return data

    let backEndUrl

    if (url.includes('/api')) {
        backEndUrl = url.split('/api')[0]
    } else {
        throw new Error('No \'/api\' in backEndUrl')
    }

    const refreshData = await fetchFromDatabase(
        `${backEndUrl}/api/v1/sessions`,
        'POST',
        'application/json',
        'include'
    )

    if (!refreshData.ok) {
        window.location.href = '/sign-in'
        throw new Error('No active session')
    }

    const refreshedData =
        await fetchFromDatabase(url, method, headers, credentials, body)

    return refreshedData
}

export default fetchWithRefresh
