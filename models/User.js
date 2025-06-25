const { query, getRow, getRows } = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class User {
  static async create(userData) {
    const { email, password, name, mobile_number, social_login_provider, social_login_provider_id, social_login_provider_image_url } = userData;
    
    const id = uuidv4();
    const hashedPassword = password ? await bcrypt.hash(password, 12) : null;
    
    const sql = `
      INSERT INTO users (id, email, password, name, mobile_number, social_login_provider, social_login_provider_id, social_login_provider_image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const result = await query(sql, [
      id, email, hashedPassword, name, mobile_number, 
      social_login_provider, social_login_provider_id, social_login_provider_image_url
    ]);
    
    return result.rows[0];
  }

  static async findByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = $1';
    return await getRow(sql, [email]);
  }

  static async findById(id) {
    const sql = 'SELECT * FROM users WHERE id = $1';
    return await getRow(sql, [id]);
  }

  static async findByMobileNumber(mobile_number) {
    const sql = 'SELECT * FROM users WHERE mobile_number = $1';
    return await getRow(sql, [mobile_number]);
  }

  static async updateLastLogin(id) {
    const sql = `
      UPDATE users 
      SET last_login_at = CURRENT_TIMESTAMP, failed_login_attempts = 0
      WHERE id = $1
      RETURNING *
    `;
    return await getRow(sql, [id]);
  }

  static async incrementFailedLoginAttempts(email) {
    const sql = `
      UPDATE users 
      SET failed_login_attempts = failed_login_attempts + 1,
          account_locked = CASE 
            WHEN failed_login_attempts >= 5 THEN TRUE 
            ELSE account_locked 
          END
      WHERE email = $1
      RETURNING *
    `;
    return await getRow(sql, [email]);
  }

  static async lockAccount(id) {
    const sql = `
      UPDATE users 
      SET account_locked = TRUE 
      WHERE id = $1
      RETURNING *
    `;
    return await getRow(sql, [id]);
  }

  static async unlockAccount(id) {
    const sql = `
      UPDATE users 
      SET account_locked = FALSE, failed_login_attempts = 0
      WHERE id = $1
      RETURNING *
    `;
    return await getRow(sql, [id]);
  }

  static async verifyEmail(id) {
    const sql = `
      UPDATE users 
      SET email_verified = TRUE 
      WHERE id = $1
      RETURNING *
    `;
    return await getRow(sql, [id]);
  }

  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const sql = `
      UPDATE users 
      SET password = $2, updated_on = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    return await getRow(sql, [id, hashedPassword]);
  }

  static async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  static async updateProfile(id, updateData) {
    const { name, mobile_number } = updateData;
    const sql = `
      UPDATE users 
      SET name = $2, mobile_number = $3, updated_on = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    return await getRow(sql, [id, name, mobile_number]);
  }

  static async deactivateAccount(id) {
    const sql = `
      UPDATE users 
      SET is_active = FALSE, updated_on = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    return await getRow(sql, [id]);
  }

  static async activateAccount(id) {
    const sql = `
      UPDATE users 
      SET is_active = TRUE, updated_on = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    return await getRow(sql, [id]);
  }

  static async getAllUsers(limit = 10, offset = 0) {
    const sql = `
      SELECT id, email, name, mobile_number, is_active, email_verified, 
             account_locked, last_login_at, created_on
      FROM users 
      ORDER BY created_on DESC 
      LIMIT $1 OFFSET $2
    `;
    return await getRows(sql, [limit, offset]);
  }

  static async countUsers() {
    const sql = 'SELECT COUNT(*) as count FROM users';
    const result = await getRow(sql);
    return parseInt(result.count);
  }
}

module.exports = User; 