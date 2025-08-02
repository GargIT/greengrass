import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express, Request, Response, NextFunction } from 'express';

// Manual OpenAPI specification (for now, to fix the blank page)
const manualSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Gröngräset Utility Billing API',
    version: '1.0.0',
    description: 'API for managing utility billing for Gröngräset Samfällighetsförening',
    contact: {
      name: 'Gröngräset Development Team',
      email: 'dev@grongrasset.se',
    },
  },
  servers: [
    {
      url: process.env.NODE_ENV === 'production' 
        ? 'https://api.grongrasset.se' 
        : `http://localhost:${process.env.PORT || 3001}`,
      description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
    },
  ],
  paths: {
    '/api/households': {
      get: {
        tags: ['Households'],
        summary: 'Get all active households',
        responses: {
          200: {
            description: 'List of households',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Household' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Households'],
        summary: 'Create a new household',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['householdNumber', 'ownerName'],
                properties: {
                  householdNumber: { type: 'integer', minimum: 1, maximum: 14, example: 1 },
                  ownerName: { type: 'string', example: 'John Doe' },
                  email: { type: 'string', format: 'email', example: 'john.doe@example.com' },
                  phone: { type: 'string', example: '070-123-4567' },
                  address: { type: 'string', example: 'Gröngräset 1' },
                  andelstal: { type: 'number', minimum: 0, maximum: 1, example: 0.07142857 },
                  annualMemberFee: { type: 'number', minimum: 0, example: 3000 }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Household created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Household' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/utility-services': {
      get: {
        tags: ['Utility Services'],
        summary: 'Get all utility services',
        responses: {
          200: {
            description: 'List of utility services',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/UtilityService' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Health check endpoint',
        responses: {
          200: {
            description: 'System health status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'OK' },
                    timestamp: { type: 'string', format: 'date-time' },
                    environment: { type: 'string', example: 'development' },
                    version: { type: 'string', example: '1.0.0' }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Household: {
        type: 'object',
        required: ['householdNumber', 'ownerName', 'email', 'andelstal'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Unique identifier for the household' },
          householdNumber: { type: 'integer', minimum: 1, maximum: 14, description: 'Household number (1-14)' },
          ownerName: { type: 'string', description: 'Name of the household owner' },
          email: { type: 'string', format: 'email', description: 'Email address' },
          phone: { type: 'string', description: 'Phone number' },
          address: { type: 'string', description: 'Physical address' },
          andelstal: { type: 'string', description: 'Share proportion (as decimal string)' },
          annualMemberFee: { type: 'string', description: 'Annual membership fee (as decimal string)' },
          isActive: { type: 'boolean', description: 'Whether the household is active' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      UtilityService: {
        type: 'object',
        required: ['name', 'unit'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', description: 'Service name (e.g., Electricity, Water)' },
          unit: { type: 'string', description: 'Measurement unit (e.g., kWh, m³)' },
          isActive: { type: 'boolean' },
          hasMainMeters: { type: 'boolean', description: 'Whether this service has main meters' },
          mainMeterCount: { type: 'integer', description: 'Number of main meters' },
          readingFrequency: { type: 'integer', description: 'Reading frequency per year' },
          requiresReconciliation: { type: 'boolean', description: 'Whether reconciliation with main meters is required' }
        }
      }
    }
  }
};

export const setupSwagger = (app: Express): void => {
  // Serve the OpenAPI spec as JSON
  app.get('/api-docs.json', (req: Request, res: Response) => {
    res.json(manualSpec);
  });
  
  // Simple test page to debug
  app.get('/api-docs-test', (req: Request, res: Response) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>API Test</title></head>
      <body>
        <h1>API Documentation Test</h1>
        <p>If you see this, the route is working.</p>
        <a href="/api-docs.json">View OpenAPI JSON</a>
      </body>
      </html>
    `);
  });
  
  // Try without CSP middleware first
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(manualSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Gröngräset API Documentation',
  }));
};
