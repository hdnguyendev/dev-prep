export const testConnection = async () => {
  try {
    // await db.authenticate();
    console.log('[DB] Connected to the database');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};
