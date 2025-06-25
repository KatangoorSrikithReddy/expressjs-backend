const { query, getRow } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class PasswordResetToken {
  static async create(userId, ipAddress, userAgent) {
    const id = uuidv4();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + (parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRY) || 30) * 60 * 1000); // 30 minutes default
    
    const sql = `
      INSERT INTO password_reset_tokens (id, user_id, token, expires_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await query(sql, [id, userId, token, expiresAt, ipAddress, userAgent]);
    return result.rows[0];
  }

  static async findByToken(token) {
    const sql = `
      SELECT prt.*, u.email, u.name 
      FROM password_reset_tokens prt
      JOIN users u ON prt.user_id = u.id
      WHERE prt.token = $1 AND prt.used = FALSE AND prt.expires_at > CURRENT_TIMESTAMP
    `;
    return await getRow(sql, [token]);
  }

  static async markAsUsed(token) {
    const sql = `
      UPDATE password_reset_tokens 
      SET used = TRUE, used_at = CURRENT_TIMESTAMP
      WHERE token = $1
      RETURNING *
    `;
    return await getRow(sql, [token]);
  }

  static async deleteExpiredTokens() {
    const sql = 'DELETE FROM password_reset_tokens WHERE expires_at < CURRENT_TIMESTAMP';
    await query(sql);
  }

  static async deleteByUserId(userId) {
    const sql = 'DELETE FROM password_reset_tokens WHERE user_id = $1';
    await query(sql, [userId]);
  }

  static async getActiveTokensByUserId(userId) {
    const sql = `
      SELECT * FROM password_reset_tokens 
      WHERE user_id = $1 AND used = FALSE AND expires_at > CURRENT_TIMESTAMP
    `;
    return await query(sql, [userId]);
  }
}

module.exports = PasswordResetToken; 