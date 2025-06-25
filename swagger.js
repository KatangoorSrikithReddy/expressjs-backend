const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TBackend Authentication API',
      version: '1.0.0',
      description: 'Complete authentication system with user registration, login, password reset, and email verification',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:8080',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User unique identifier'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            name: {
              type: 'string',
              description: 'User full name'
            },
            mobile_number: {
              type: 'string',
              description: 'User mobile number (10 digits)'
            },
            email_verified: {
              type: 'boolean',
              description: 'Whether email is verified'
            },
            is_active: {
              type: 'boolean',
              description: 'Whether account is active'
            },
            account_locked: {
              type: 'boolean',
              description: 'Whether account is locked'
            },
            last_login_at: {
              type: 'string',
              format: 'date-time',
              description: 'Last login timestamp'
            },
            created_on: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            },
            updated_on: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'name', 'mobile_number'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Valid email address'
            },
            password: {
              type: 'string',
              minLength: 8,
              description: 'Password (min 8 chars, must contain uppercase, lowercase, number, and special character)'
            },
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'Full name'
            },
            mobile_number: {
              type: 'string',
              pattern: '^[0-9]{10}$',
              description: '10-digit mobile number'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email'
            },
            password: {
              type: 'string',
              description: 'User password'
            }
          }
        },
        ForgotPasswordRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Email address for password reset'
            }
          }
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['token', 'password'],
          properties: {
            token: {
              type: 'string',
              description: 'Reset token from email'
            },
            password: {
              type: 'string',
              minLength: 8,
              description: 'New password (min 8 chars, must contain uppercase, lowercase, number, and special character)'
            }
          }
        },
        VerifyEmailRequest: {
          type: 'object',
          required: ['token'],
          properties: {
            token: {
              type: 'string',
              description: 'Verification token from email'
            }
          }
        },
        ProfileUpdateRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'Updated full name'
            },
            mobile_number: {
              type: 'string',
              pattern: '^[0-9]{10}$',
              description: 'Updated 10-digit mobile number'
            }
          }
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: {
              type: 'string',
              description: 'Current password'
            },
            newPassword: {
              type: 'string',
              minLength: 8,
              description: 'New password (min 8 chars, must contain uppercase, lowercase, number, and special character)'
            }
          }
        },
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: {
              type: 'string',
              description: 'Refresh token from login response'
            }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the request was successful'
            },
            message: {
              type: 'string',
              description: 'Response message'
            },
            data: {
              type: 'object',
              description: 'Response data (if any)'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    description: 'Field name with error'
                  },
                  message: {
                    type: 'string',
                    description: 'Error message for the field'
                  }
                }
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints'
      },
      {
        name: 'User Management',
        description: 'User profile and account management'
      },
      {
        name: 'Health',
        description: 'Server health check'
      }
    ]
  },
  apis: ['./routes/*.js', './server.js'], // Path to the API docs
};

const swaggerSpec = swaggerJSDoc(options);

function setupSwagger(app) {
  // Serve Swagger UI
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'TBackend API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true
    }
  }));

  // Serve Swagger JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

module.exports = setupSwagger; 