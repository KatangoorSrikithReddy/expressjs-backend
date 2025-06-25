const { query, getRow } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class UserSession {
  static async create(userId, ipAddress, userAgent) {
    const id = uuidv4();
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    const sql = `
      INSERT INTO user_sessions (id, user_id, session_token, refresh_token, expires_at, refresh_expires_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const result = await query(sql, [id, userId, sessionToken, refreshToken, expiresAt, refreshExpiresAt, ipAddress, userAgent]);
    return result.rows[0];
  }

  static async findBySessionToken(sessionToken) {
    const sql = `
      SELECT us.*, u.email, u.name, u.is_active, u.account_locked
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.session_token = $1 AND us.is_active = TRUE AND us.expires_at > CURRENT_TIMESTAMP
    `;
    return await getRow(sql, [sessionToken]);
  }

  static async findByRefreshToken(refreshToken) {
    const sql = `
      SELECT us.*, u.email, u.name, u.is_active, u.account_locked
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.refresh_token = $1 AND us.is_active = TRUE AND us.refresh_expires_at > CURRENT_TIMESTAMP
    `;
    return await getRow(sql, [refreshToken]);
  }

  static async updateLastAccessed(sessionId) {
    const sql = `
      UPDATE user_sessions 
      SET last_accessed_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    return await getRow(sql, [sessionId]);
  }

  static async deactivateSession(sessionId) {
    const sql = `
      UPDATE user_sessions 
      SET is_active = FALSE, logged_out_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    return await getRow(sql, [sessionId]);
  }

  static async deactivateAllUserSessions(userId) {
    const sql = `
      UPDATE user_sessions 
      SET is_active = FALSE, logged_out_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND is_active = TRUE
    `;
    await query(sql, [userId]);
  }

  static async deleteExpiredSessions() {
    const sql = 'DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP';
    await query(sql);
  }

  static async getActiveSessionsByUserId(userId) {
    const sql = `
      SELECT * FROM user_sessions 
      WHERE user_id = $1 AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC
    `;
    return await query(sql, [userId]);
  }

  static async countActiveSessionsByUserId(userId) {
    const sql = `
      SELECT COUNT(*) as count FROM user_sessions 
      WHERE user_id = $1 AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP
    `;
    const result = await getRow(sql, [userId]);
    return parseInt(result.count);
  }
}

module.exports = UserSession; 