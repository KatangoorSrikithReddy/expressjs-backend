const request = require('supertest');
const app = require('../server');

describe('Authentication API', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'TestPass123!',
    name: 'Test User',
    mobile_number: '1234567890'
  };

  let authToken;

  describe('POST /api/v1/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/v1/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.name).toBe(testUser.name);
    });

    it('should not register user with existing email', async () => {
      const response = await request(app)
        .post('/api/v1/register')
        .send(testUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('POST /api/v1/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      
      authToken = response.body.data.token;
    });

    it('should not login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/user/profile', () => {
    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should not get profile without token', async () => {
      const response = await request(app)
        .get('/api/v1/user/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/logout', () => {
    it('should logout user with valid token', async () => {
      const response = await request(app)
        .post('/api/v1/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});

describe('Health Check', () => {
  it('should return health status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Server is running');
  });
}); 