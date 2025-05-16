const checkForDuplicate = async (
    value,
    columnName,
    fetchFunction,
    excludeId = null
) => {
    const rows = await fetchFunction()

    if (rows.length === 0 || !Array.isArray(rows)) return 'pass'

    const hasDuplicate = rows.some(
        row => row[columnName] === value && row.id !== excludeId
    )
    
    return hasDuplicate ? 'fail' : 'pass'
}

export default checkForDuplicate
