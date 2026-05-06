import 'dotenv/config';
import { query } from '../src/repositories/fbRepository';

(async () => {
  console.log('Probando conexión a Firebird con:');
  console.log('  host:    ', process.env.FB_HOST);
  console.log('  port:    ', process.env.FB_PORT);
  console.log('  database:', process.env.FB_DATABASE);
  console.log('  user:    ', process.env.FB_USER);

  try {
    const rows = await query<{ RESULT: number }>({
      sql: 'SELECT 1 AS RESULT FROM RDB$DATABASE',
    });
    console.log('\n✓ Conexión OK. SELECT 1 devolvió:', rows);

    const tableCount = await query<{ TOTAL: number }>({
      sql: "SELECT COUNT(*) AS TOTAL FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG = 0",
    });
    console.log('✓ Tablas de usuario en la DB:', tableCount[0]?.TOTAL);

    process.exit(0);
  } catch (err) {
    console.error('\n✗ Falló la conexión:', err);
    process.exit(1);
  }
})();
