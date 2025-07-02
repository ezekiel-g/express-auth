import dbConnection from '../db/dbConnection.js';

const getUsers = async () => {
  const sqlResult = await dbConnection.executeQuery('SELECT * FROM users;');
  return sqlResult;
};

const checkForDuplicate = async (
  entryObject,
  sqlQueryFunction,
  excludeIdForUpdate = null,
) => {
  const sqlResult = await sqlQueryFunction();

  if (sqlResult.length === 0 || !Array.isArray(sqlResult)) return 'pass';

  const [columnNameCamel] = Object.keys(entryObject);
  const columnNameSnake = columnNameCamel
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase();

  const rowValue = entryObject[columnNameCamel]
    ? entryObject[columnNameCamel].toLowerCase()
    : '';

  const hasDuplicate = sqlResult.some((row) => {
    return (
      row[columnNameSnake]?.toLowerCase() === rowValue &&
      row.id !== excludeIdForUpdate
    );
  });

  return hasDuplicate ? 'fail' : 'pass';
};

const returnSuccess = (label, input, currentValue = null) => {
  if (
    currentValue !== null &&
    currentValue !== undefined &&
    input !== currentValue
  ) {
    if (currentValue && label === 'Email address') {
      return {
        valid: true,
        message: `${label} update pending email confirmation`,
      };
    }

    return { valid: true, message: `${label} updated successfully` };
  }

  return { valid: true, message: null };
};

export default { getUsers, checkForDuplicate, returnSuccess };
