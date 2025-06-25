const { query, getRow } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class EmailVerificationToken {
  static async create(contactValue, contactType, ipAddress, userAgent) {
    const id = uuidv4();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + (parseInt(process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY) || 60) * 60 * 1000); // 60 minutes default
    
    const sql = `
      INSERT INTO email_verification_tokens (id, contact_value, token, expires_at, contact_type, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await query(sql, [id, contactValue, token, expiresAt, contactType, ipAddress, userAgent]);
    return result.rows[0];
  }

  static async findByToken(token) {
    const sql = `
      SELECT * FROM email_verification_tokens 
      WHERE token = $1 AND verified = FALSE AND expires_at > CURRENT_TIMESTAMP
    `;
    return await getRow(sql, [token]);
  }

  static async markAsVerified(token) {
    const sql = `
      UPDATE email_verification_tokens 
      SET verified = TRUE, verified_at = CURRENT_TIMESTAMP
      WHERE token = $1
      RETURNING *
    `;
    return await getRow(sql, [token]);
  }

  static async deleteExpiredTokens() {
    const sql = 'DELETE FROM email_verification_tokens WHERE expires_at < CURRENT_TIMESTAMP';
    await query(sql);
  }

  static async deleteByContactValue(contactValue, contactType) {
    const sql = 'DELETE FROM email_verification_tokens WHERE contact_value = $1 AND contact_type = $2';
    await query(sql, [contactValue, contactType]);
  }

  static async getActiveTokensByContactValue(contactValue, contactType) {
    const sql = `
      SELECT * FROM email_verification_tokens 
      WHERE contact_value = $1 AND contact_type = $2 AND verified = FALSE AND expires_at > CURRENT_TIMESTAMP
    `;
    return await query(sql, [contactValue, contactType]);
  }

  static async isVerified(contactValue, contactType) {
    const sql = `
      SELECT COUNT(*) as count FROM email_verification_tokens 
      WHERE contact_value = $1 AND contact_type = $2 AND verified = TRUE
    `;
    const result = await getRow(sql, [contactValue, contactType]);
    return parseInt(result.count) > 0;
  }
}

module.exports = EmailVerificationToken; 