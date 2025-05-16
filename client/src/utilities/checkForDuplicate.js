const checkForDuplicate = async (
    entryObject,
    fetchFunction,
    excludeId = null
) => {
    const rows = await fetchFunction()

    if (rows.length === 0 || !Array.isArray(rows)) return 'pass'
    
    const columnName = Object.keys(entryObject)[0]
    const value = entryObject[columnName]

    const hasDuplicate = rows.some(
        row => row[columnName] === value && row.id !== excludeId
    )
    
    return hasDuplicate ? 'fail' : 'pass'
}

export default checkForDuplicate
