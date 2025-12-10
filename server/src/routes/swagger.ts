import { Hono } from "hono";
import { resources } from "./crud";

type SchemaRef = { $ref: string };

const jsonSchema: SchemaRef = { $ref: "#/components/schemas/JsonObject" };

const toProperties = (fields: string[]) =>
  fields.reduce<Record<string, any>>((acc, key) => {
    acc[key] = { type: "string" };
    return acc;
  }, {});

const buildPaths = () => {
  const paths: Record<string, any> = {};

  resources.forEach((resource) => {
    const basePath = `/${resource.path}`;
    const idPath = `${basePath}/${resource.primaryKeys.map((k) => `{${k}}`).join("/")}`;

    const pathParameters = resource.primaryKeys.map((key) => ({
      name: key,
      in: "path",
      required: true,
      schema: { type: "string" },
    }));

    const requestBodySchema = {
      type: "object",
      properties: toProperties(resource.allowedFields),
      additionalProperties: false,
    };

    paths[basePath] = {
      get: {
        summary: `List ${resource.path}`,
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
        ],
        responses: {
          200: { description: "Success", content: { "application/json": { schema: jsonSchema } } },
        },
      },
      post: {
        summary: `Create ${resource.path}`,
        requestBody: {
          required: true,
          content: { "application/json": { schema: requestBodySchema } },
        },
        responses: {
          201: { description: "Created", content: { "application/json": { schema: jsonSchema } } },
        },
      },
    };

    paths[idPath] = {
      get: {
        summary: `Get ${resource.path} by id`,
        parameters: pathParameters,
        responses: {
          200: { description: "Success", content: { "application/json": { schema: jsonSchema } } },
          404: { description: "Not found" },
        },
      },
      put: {
        summary: `Update ${resource.path}`,
        parameters: pathParameters,
        requestBody: {
          required: true,
          content: { "application/json": { schema: requestBodySchema } },
        },
        responses: {
          200: { description: "Updated", content: { "application/json": { schema: jsonSchema } } },
          404: { description: "Not found" },
        },
      },
      delete: {
        summary: `Delete ${resource.path}`,
        parameters: pathParameters,
        responses: {
          200: { description: "Deleted", content: { "application/json": { schema: jsonSchema } } },
          404: { description: "Not found" },
        },
      },
    };
  });

  return paths;
};

const openApiDocument = {
  openapi: "3.0.1",
  info: {
    title: "Dev-Prep API",
    description: "Auto-generated CRUD docs from Prisma schema",
    version: "1.0.0",
  },
  servers: [{ url: "/" }],
  paths: buildPaths(),
  components: {
    schemas: {
      JsonObject: { type: "object", additionalProperties: true },
    },
  },
};

const swaggerRoutes = new Hono();

swaggerRoutes.get("/swagger.json", (c) => c.json(openApiDocument));

swaggerRoutes.get("/docs", (c) =>
  c.html(`<!doctype html>
<html>
  <head>
    <title>Dev-Prep API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        SwaggerUIBundle({
          url: "/swagger.json",
          dom_id: '#swagger-ui',
        });
      };
    </script>
  </body>
</html>`)
);

export default swaggerRoutes;
