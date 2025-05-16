const checkForDuplicate = async (
    entry,
    fetchFunction,
    excludeId = null
) => {
    const rows = await fetchFunction()

    if (rows.length === 0  || !Array.isArray(rows)) return 'pass'

    const [columnName] = Object.keys(entry)
    const value = entry[columnName]

    const hasDuplicate = rows.some(
        row => row[columnName] === value && row.id !== excludeId
    )

    return hasDuplicate ? 'fail' : 'pass'
}

export default checkForDuplicate
