const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  console.log('🚀 Setting up your database...\n');
  
  // Check if .env file exists
  if (!fs.existsSync('.env')) {
    console.log('❌ .env file not found!');
    console.log('Please copy env.example to .env and update your database password:');
    console.log('  copy env.example .env');
    console.log('Then edit .env and set your actual PostgreSQL password.');
    return;
  }

  // Display connection settings
  console.log('📋 Database Configuration:');
  console.log(`Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`Port: ${process.env.DB_PORT || 5432}`);
  console.log(`Database: ${process.env.DB_NAME || 'tbackend_db'}`);
  console.log(`User: ${process.env.DB_USER || 'postgres'}`);
  console.log(`Password: ${process.env.DB_PASSWORD ? '***SET***' : '***NOT SET***'}`);
  console.log('');

  if (!process.env.DB_PASSWORD) {
    console.log('❌ Database password not set in .env file');
    console.log('Please add your PostgreSQL password to the .env file');
    return;
  }

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'tbackend_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('🔄 Testing database connection...');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Check if database exists, if not create it
    const dbExists = await client.query(`
      SELECT 1 FROM pg_database WHERE datname = $1
    `, [process.env.DB_NAME || 'tbackend_db']);
    
    if (dbExists.rows.length === 0) {
      console.log(`📦 Creating database: ${process.env.DB_NAME || 'tbackend_db'}`);
      await client.query(`CREATE DATABASE ${process.env.DB_NAME || 'tbackend_db'}`);
      console.log('✅ Database created successfully!');
    } else {
      console.log('✅ Database already exists');
    }
    
    // Read and execute the full schema
    console.log('\n📄 Reading database schema...');
    const schemaFile = path.join(__dirname, 'database', 'schema.sql');
    
    if (!fs.existsSync(schemaFile)) {
      console.log('❌ Schema file not found at database/schema.sql');
      return;
    }
    
    const schema = fs.readFileSync(schemaFile, 'utf8');
    console.log('📄 Executing database schema...');
    
    // Split schema into individual statements and execute them
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await client.query(statement);
        } catch (error) {
          if (error.code === '42P07') {
            // Table already exists, this is fine
            console.log('  ⚠️  Some tables already exist (this is normal)');
          } else {
            console.log(`  ❌ Error executing: ${statement.substring(0, 50)}...`);
            console.log(`     ${error.message}`);
          }
        }
      }
    }
    
    console.log('✅ Schema executed successfully!');
    
    // Verify all tables exist
    console.log('\n🔍 Verifying tables...');
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
    
    if (existingTables.length === requiredTables.length) {
      console.log('\n🎉 All tables created successfully!');
      console.log('Your database is ready to use.');
      
      // Check if there are any users
      const userCount = await client.query('SELECT COUNT(*) as count FROM users');
      console.log(`👥 Users in database: ${userCount.rows[0].count}`);
      
    } else {
      console.log('\n⚠️  Some tables are missing. Please check the schema file.');
    }
    
    client.release();
    
  } catch (error) {
    console.log('\n❌ Database setup failed!');
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
      console.log('   - The script will create it automatically');
    }
    
  } finally {
    await pool.end();
  }
}

// Run the setup
setupDatabase().catch(console.error); 