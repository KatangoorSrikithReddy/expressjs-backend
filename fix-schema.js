const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function fixSchema() {
  console.log('🔧 Fixing database schema...\n');
  
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'tbackend_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database');
    
    // Create tables one by one with proper error handling
    console.log('\n📋 Creating tables...');
    
    // 1. Users table
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) NOT NULL,
          password VARCHAR(255),
          name VARCHAR(100) NOT NULL,
          mobile_number VARCHAR(10) NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          email_verified BOOLEAN DEFAULT FALSE,
          account_locked BOOLEAN DEFAULT FALSE,
          failed_login_attempts INTEGER DEFAULT 0,
          last_login_at TIMESTAMP,
          social_login_provider VARCHAR(50) NULL,
          social_login_provider_id VARCHAR(255) NULL,
          social_login_provider_image_url VARCHAR(255) NULL,
          created_by UUID,
          updated_by UUID,
          created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT uk_users_email UNIQUE (email)
        )
      `);
      console.log('  ✅ users table created');
    } catch (error) {
      if (error.code === '42P07') {
        console.log('  ⚠️  users table already exists');
      } else {
        console.log(`  ❌ Error creating users table: ${error.message}`);
      }
    }
    
    // 2. Password reset tokens table
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          token VARCHAR(255) NOT NULL UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          used_at TIMESTAMP,
          ip_address INET,
          user_agent TEXT,
          CONSTRAINT fk_password_reset_tokens_user_id 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('  ✅ password_reset_tokens table created');
    } catch (error) {
      if (error.code === '42P07') {
        console.log('  ⚠️  password_reset_tokens table already exists');
      } else {
        console.log(`  ❌ Error creating password_reset_tokens table: ${error.message}`);
      }
    }
    
    // 3. Email verification tokens table
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS email_verification_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          contact_value VARCHAR(255) NOT NULL,
          token VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          contact_type VARCHAR(20) NOT NULL CHECK (contact_type IN ('email', 'mobile_number')),
          verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          verified_at TIMESTAMP,
          ip_address INET,
          user_agent TEXT
        )
      `);
      console.log('  ✅ email_verification_tokens table created');
    } catch (error) {
      if (error.code === '42P07') {
        console.log('  ⚠️  email_verification_tokens table already exists');
      } else {
        console.log(`  ❌ Error creating email_verification_tokens table: ${error.message}`);
      }
    }
    
    // 4. User sessions table
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          session_token VARCHAR(255) NOT NULL UNIQUE,
          refresh_token VARCHAR(255) UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          refresh_expires_at TIMESTAMP,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          logged_out_at TIMESTAMP,
          ip_address INET,
          user_agent TEXT,
          CONSTRAINT fk_user_sessions_user_id 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('  ✅ user_sessions table created');
    } catch (error) {
      if (error.code === '42P07') {
        console.log('  ⚠️  user_sessions table already exists');
      } else {
        console.log(`  ❌ Error creating user_sessions table: ${error.message}`);
      }
    }
    
    // Create indexes
    console.log('\n📊 Creating indexes...');
    
    const indexes = [
      { name: 'idx_users_email', sql: 'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)' },
      { name: 'idx_users_mobile_number', sql: 'CREATE INDEX IF NOT EXISTS idx_users_mobile_number ON users(mobile_number)' },
      { name: 'idx_users_name', sql: 'CREATE INDEX IF NOT EXISTS idx_users_name ON users(name)' },
      { name: 'idx_password_reset_tokens_expires_at', sql: 'CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at)' },
      { name: 'idx_evt_token_valid', sql: 'CREATE INDEX IF NOT EXISTS idx_evt_token_valid ON email_verification_tokens(token, verified, expires_at)' },
      { name: 'idx_user_sessions_active_valid', sql: 'CREATE INDEX IF NOT EXISTS idx_user_sessions_active_valid ON user_sessions(user_id, session_token) WHERE is_active = TRUE AND expires_at > CURRENT_TIMESTAMP' },
      { name: 'idx_user_sessions_refresh_token', sql: 'CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token)' }
    ];
    
    for (const index of indexes) {
      try {
        await client.query(index.sql);
        console.log(`  ✅ ${index.name} created`);
      } catch (error) {
        if (error.code === '42P11') {
          console.log(`  ⚠️  ${index.name} already exists`);
        } else {
          console.log(`  ❌ Error creating ${index.name}: ${error.message}`);
        }
      }
    }
    
    // Create function and trigger
    console.log('\n⚙️  Creating functions and triggers...');
    
    try {
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_on_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_on = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql'
      `);
      console.log('  ✅ update_updated_on_column function created');
    } catch (error) {
      console.log(`  ❌ Error creating function: ${error.message}`);
    }
    
    try {
      await client.query(`
        DROP TRIGGER IF EXISTS update_users_updated_on ON users;
        CREATE TRIGGER update_users_updated_on 
        BEFORE UPDATE ON users 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_on_column()
      `);
      console.log('  ✅ update_users_updated_on trigger created');
    } catch (error) {
      console.log(`  ❌ Error creating trigger: ${error.message}`);
    }
    
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
      console.log('\n⚠️  Some tables are missing. Please check the errors above.');
    }
    
    client.release();
    
  } catch (error) {
    console.log('\n❌ Database setup failed!');
    console.log('Error details:');
    console.log(`  Code: ${error.code}`);
    console.log(`  Message: ${error.message}`);
  } finally {
    await pool.end();
  }
}

// Run the fix
fixSchema().catch(console.error); 