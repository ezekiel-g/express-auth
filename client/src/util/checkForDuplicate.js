const checkForDuplicate = async (
    entryObject,
    fetchFunction,
    excludeIdForUpdate = null
) => {
    const rows = await fetchFunction()
    
    if (rows.length === 0 || !Array.isArray(rows)) return 'pass'

    const [columnName] = Object.keys(entryObject)
    const rowValue = entryObject[columnName]?.toLowerCase()
    const ciColumnName = `${columnName}_ci`
    const hasDuplicate = rows.some(row => {
        return row[ciColumnName] === rowValue && row.id !== excludeIdForUpdate
    })
    
    return hasDuplicate ? 'fail' : 'pass'
}

export default checkForDuplicate
