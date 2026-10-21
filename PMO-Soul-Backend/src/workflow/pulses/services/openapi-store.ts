import type { OpenAPIObject } from '@nestjs/swagger';

/**
 * Holds the app's generated OpenAPI document so the Pulses API-catalog endpoint
 * can introspect every callable route (method, path, tag, summary, body schema).
 * Set once at bootstrap from the same document Swagger already builds.
 */
let doc: OpenAPIObject | null = null;

export const OpenApiStore = {
  set(d: OpenAPIObject) {
    doc = d;
  },
  get(): OpenAPIObject | null {
    return doc;
  },
};
