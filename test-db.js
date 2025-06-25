const { Pool } = require('pg');
require('dotenv').config();

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection...\n');
  
  // Display connection settings
  console.log('📋 Connection Settings:');
  console.log(`Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`Port: ${process.env.DB_PORT || 5432}`);
  console.log(`Database: ${process.env.DB_NAME || 'tbackend_db'}`);
  console.log(`User: ${process.env.DB_USER || 'postgres'}`);
  console.log(`Password: ${process.env.DB_PASSWORD ? '***SET***' : '***NOT SET***'}`);
  console.log('');

  if (!process.env.DB_PASSWORD) {
    console.log('❌ ERROR: Database password not set in .env file');
    console.log('Please add DB_PASSWORD=your_password to your .env file');
    return;
  }

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'tbackend_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 5000,
  });

  try {
    console.log('🔄 Attempting to connect...');
    
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Test query
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Database query successful!');
    console.log(`📅 Current time: ${result.rows[0].current_time}`);
    console.log(`🐘 PostgreSQL version: ${result.rows[0].pg_version.split(',')[0]}`);
    
    // Check if tables exist
    console.log('\n📊 Checking database tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'password_reset_tokens', 'email_verification_tokens', 'user_sessions')
      ORDER BY table_name
    `);
    
    const existingTables = tablesResult.rows.map(row => row.table_name);
    const requiredTables = ['users', 'password_reset_tokens', 'email_verification_tokens', 'user_sessions'];
    
    console.log('📋 Required tables:');
    requiredTables.forEach(table => {
      const exists = existingTables.includes(table);
      console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    });
    
    if (existingTables.length === 0) {
      console.log('\n⚠️  WARNING: No required tables found!');
      console.log('You need to run the database schema. Use the SQL from database/schema.sql');
    } else if (existingTables.length < requiredTables.length) {
      console.log('\n⚠️  WARNING: Some tables are missing!');
      console.log('You need to run the complete database schema.');
    } else {
      console.log('\n✅ All required tables exist!');
    }
    
    // Check user count
    if (existingTables.includes('users')) {
      const userCount = await client.query('SELECT COUNT(*) as count FROM users');
      console.log(`👥 Users in database: ${userCount.rows[0].count}`);
    }
    
    client.release();
    console.log('\n🎉 Database connection test completed successfully!');
    
  } catch (error) {
    console.log('\n❌ Database connection failed!');
    console.log('Error details:');
    console.log(`  Code: ${error.code}`);
    console.log(`  Message: ${error.message}`);
    
    // Provide helpful error messages
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Solution: PostgreSQL server is not running');
      console.log('   - Start PostgreSQL service');
      console.log('   - Check if PostgreSQL is installed');
    } else if (error.code === '28P01') {
      console.log('\n💡 Solution: Authentication failed');
      console.log('   - Check your DB_USER and DB_PASSWORD in .env file');
      console.log('   - Verify PostgreSQL user credentials');
    } else if (error.code === '3D000') {
      console.log('\n💡 Solution: Database does not exist');
      console.log('   - Create database: CREATE DATABASE tbackend_db;');
    } else if (error.code === '42P01') {
      console.log('\n💡 Solution: Tables do not exist');
      console.log('   - Run the schema from database/schema.sql');
    }
    
  } finally {
    await pool.end();
  }
}

// Run the test
testDatabaseConnection().catch(console.error); 