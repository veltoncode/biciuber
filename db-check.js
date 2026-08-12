import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function run() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    // TAREFA 1: Encontrar subscriptions órfãs
    const { rows: orphaned } = await client.query(`
      SELECT id, driver_id FROM push_subscriptions 
      WHERE user_type = 'DRIVER' 
        AND driver_id IS NOT NULL 
        AND driver_id NOT IN (SELECT id FROM drivers)
    `);
    
    console.log(`Orphaned subscriptions found: ${orphaned.length}`);
    if (orphaned.length > 0) {
      console.log('Deleting orphaned subscriptions...');
      for (const sub of orphaned) {
        await client.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
        console.log(`Deleted subscription ${sub.id} (orphaned driver ${sub.driver_id})`);
      }
    }

    // Adicionar constraint se não existir
    const checkConstraint = await client.query(`
      SELECT conname FROM pg_constraint 
      WHERE conname = 'fk_push_subscriptions_driver_id'
    `);
    if (checkConstraint.rows.length === 0) {
      console.log('Adding foreign key constraint with ON DELETE CASCADE...');
      await client.query(`
        ALTER TABLE push_subscriptions
        ADD CONSTRAINT fk_push_subscriptions_driver_id
        FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
      `);
      console.log('Constraint added successfully.');
    } else {
      console.log('Constraint already exists.');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}
run();
