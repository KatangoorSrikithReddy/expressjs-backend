const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runSchema() {
  console.log('🔧 Running missing database schema...\n');
  
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'tbackend_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'fix-missing-tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📄 Executing SQL schema...');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('✅ Schema executed successfully!');
    console.log('✅ Missing tables created:');
    console.log('   - password_reset_tokens');
    console.log('   - email_verification_tokens');
    
    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'password_reset_tokens', 'email_verification_tokens', 'user_sessions')
      ORDER BY table_name
    `);
    
    const tables = result.rows.map(row => row.table_name);
    console.log('📋 All tables:');
    tables.forEach(table => {
      console.log(`  ✅ ${table}`);
    });
    
    if (tables.length === 4) {
      console.log('\n🎉 All required tables are now present!');
      console.log('Your database is ready to use.');
    }
    
  } catch (error) {
    console.log('\n❌ Error running schema:');
    console.log(`  Code: ${error.code}`);
    console.log(`  Message: ${error.message}`);
    
    if (error.code === '42P07') {
      console.log('\n💡 Some tables already exist, this is normal.');
    }
    
  } finally {
    await pool.end();
  }
}

// Run the schema
runSchema().catch(console.error); 