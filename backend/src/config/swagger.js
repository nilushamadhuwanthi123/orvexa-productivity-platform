import swaggerJsdoc from 'swagger-jsdoc';
import env from './env.js';

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Orvexa API',
      version: '1.0.0',
      description:
        'REST API for Orvexa — a modern operations and productivity platform. ' +
        'All endpoints except /api/health and the auth endpoints require a Bearer access token.',
    },
    servers: [{ url: `http://localhost:${env.port}`, description: 'Local development' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: { message: { type: 'string' }, details: { type: 'array', items: {} } },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Registration, sign-in, tokens and passwords' },
      { name: 'Projects', description: 'Project lifecycle and membership' },
      { name: 'Tasks', description: 'Task CRUD, Kanban moves and checklists' },
      { name: 'Analytics', description: 'Dashboard KPIs, productivity and project health' },
      { name: 'System', description: 'Health and diagnostics' },
    ],
  },
  apis: ['./src/routes/*.js'],
});

export default swaggerSpec;
