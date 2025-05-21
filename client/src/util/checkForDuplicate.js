const checkForDuplicate = async (
    entryObject,
    fetchFunction,
    excludeId = null
) => {
    const rows = await fetchFunction()

    if (rows.length === 0 || !Array.isArray(rows)) return 'pass'

    const [columnName] = Object.keys(entryObject)
    const value = entryObject[columnName]?.toLowerCase()
    const ciColumnName = `${columnName}_ci`
    const hasDuplicate = rows.some(
        row => row[ciColumnName] === value && row.id !== excludeId
    )

    return hasDuplicate ? 'fail' : 'pass'
}

export default checkForDuplicate
