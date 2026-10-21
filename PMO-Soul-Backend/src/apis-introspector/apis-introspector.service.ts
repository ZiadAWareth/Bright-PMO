import { Injectable } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { PATH_METADATA, METHOD_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';

@Injectable()
export class ApisIntrospectorService {
  constructor(private readonly modulesContainer: ModulesContainer) {}

  getRoutes() {
    console.log('[ApisIntrospector] 🔍 Starting route introspection...');
    const routes: Array<{
      controller: string;
      methodName: string;
      httpMethod: string | string[];
      path: string;
      params?: any[];
      queries?: any[];
      body?: any;
      headers?: any[];
      requiresAuth?: boolean;
      authType?: string;
    }> = [];

    const modules = Array.from(this.modulesContainer.values());
    console.log(`[ApisIntrospector] 📦 Found ${modules.length} module(s)`);

    for (const moduleRef of modules) {
      const controllers = Array.from(moduleRef.controllers.values());
      console.log(`[ApisIntrospector] 🎮 Module has ${controllers.length} controller(s)`);

      for (const controllerRef of controllers) {
        const instance = controllerRef.instance;
        if (!instance || !controllerRef.metatype) {
          console.log('[ApisIntrospector] ⚠️  Skipping controller: missing instance or metatype');
          continue;
        }

        const controllerPath =
          Reflect.getMetadata(PATH_METADATA, controllerRef.metatype as object) || '';
        const controllerName = controllerRef.metatype.name;
        
        // Skip introspection controller itself (by exact name first, then case-insensitive check)
        if (controllerName === 'ApisIntrospectorController') {
          console.log(`[ApisIntrospector] ⏭️  Skipping introspection controller: ${controllerName}`);
          continue;
        }
        
        // Also check by path and case-insensitive name
        const controllerNameLower = controllerName.toLowerCase();
        const controllerPathLower = (controllerPath || '').toLowerCase();
        if (controllerNameLower.includes('introspection') || controllerPathLower.includes('introspection') || controllerPathLower === '__introspection' || controllerPath === '__introspection') {
          console.log(`[ApisIntrospector] ⏭️  Skipping introspection controller: ${controllerName} (path: ${controllerPath})`);
          continue;
        }
        
        console.log(`[ApisIntrospector] 🎯 Processing controller: ${controllerName} (path: ${controllerPath || '/'})`);
        
        const prototype = Object.getPrototypeOf(instance);
        const methodNames = Object.getOwnPropertyNames(prototype);
        console.log(`[ApisIntrospector]   Found ${methodNames.length} method(s) in ${controllerName}`);

        for (const methodName of methodNames) {
          if (methodName === 'constructor') continue;

          const handler = prototype[methodName];
          const routePath = Reflect.getMetadata(PATH_METADATA, handler);
          const httpMethod = Reflect.getMetadata(METHOD_METADATA, handler);

          // Swagger metadata (if present)
          const apiParams = Reflect.getMetadata('swagger/apiParameters', handler) || [];
          const apiBody = Reflect.getMetadata('swagger/apiBody', handler);
          const apiHeaders = Reflect.getMetadata('swagger/apiHeaders', handler) || [];
          // Also check for headers in apiParams (some Swagger setups use this)
          const headerParams = apiParams.filter((p: any) => p?.in === 'header');
          // Combine headers from both sources (apiHeaders and header params)
          const allHeaders = [...apiHeaders, ...headerParams];
          
          // Check for authentication requirements
          // 1. Check for guards on method level
          const methodGuards = Reflect.getMetadata(GUARDS_METADATA, handler) || [];
          // 2. Check for guards on controller level
          const controllerGuards = Reflect.getMetadata(GUARDS_METADATA, controllerRef.metatype as object) || [];
          const allGuards = [...methodGuards, ...controllerGuards];
          
          // Check guard names/classes to see if they're auth-related
          const hasAuthGuard = allGuards.some((guard: any) => {
            const guardName = guard?.name || guard?.constructor?.name || String(guard);
            return guardName.includes('Auth') || guardName.includes('Guard');
          });
          
          // Check for Swagger auth decorators
          const apiBearerAuth = Reflect.getMetadata('swagger/apiBearerAuth', handler) || 
                                Reflect.getMetadata('swagger/apiBearerAuth', controllerRef.metatype as object);
          const apiSecurity = Reflect.getMetadata('swagger/apiSecurity', handler) || 
                              Reflect.getMetadata('swagger/apiSecurity', controllerRef.metatype as object);
          
          // Also check for @ApiBearerAuth in Swagger metadata (different key)
          const swaggerBearerAuth = Reflect.getMetadata('swagger/apiBearerAuth', handler) !== undefined ||
                                     Reflect.getMetadata('swagger/apiBearerAuth', controllerRef.metatype as object) !== undefined;
          
          // Determine if auth is required
          // Most controllers have @UseGuards(AuthGuard, PermissionsGuard) at controller level
          // So if we find guards, assume auth is required
          // Also check: if controller is not AppController or AuthController, it likely requires auth
          const isPublicController = controllerName === 'AppController' || 
                                     controllerName === 'AuthController' ||
                                     controllerName.includes('Introspection');
          const requiresAuth = !isPublicController || 
                               allGuards.length > 0 || 
                               hasAuthGuard || 
                               !!apiBearerAuth || 
                               !!apiSecurity || 
                               swaggerBearerAuth;
          const authType = apiBearerAuth || swaggerBearerAuth ? 'Bearer' : 
                          apiSecurity ? 'Security' : 
                          (allGuards.length > 0 || hasAuthGuard) ? 'Guard' : 
                          (!isPublicController ? 'Bearer' : undefined);
          
          // Check for @Body() and @Headers() decorators
          // Method 1: Check ROUTE_ARGS_METADATA (NestJS stores parameter decorators here)
          const routeArgs = Reflect.getMetadata(ROUTE_ARGS_METADATA, handler) || {};
          let hasBody = false;
          let hasHeaders = false;
          let bodyType: any = null;
          
          // Check route args for body and headers
          // Route args are stored as an object with keys like '0:body', '1:query', etc.
          Object.keys(routeArgs).forEach((key) => {
            const argData = routeArgs[key];
            if (argData) {
              // Body decorator - check data property
              const data = argData.data;
              if (data === 'body' || data === '') {
                hasBody = true;
                // Try to get the parameter type
                const paramTypes = Reflect.getMetadata('design:paramtypes', handler) || [];
                const paramIndex = parseInt(key.split(':')[0]);
                if (paramTypes[paramIndex]) {
                  bodyType = paramTypes[paramIndex].name || 'object';
                }
              }
              // Headers decorator
              if (data === 'headers') {
                hasHeaders = true;
              }
              // Check factory function name
              if (argData.factory) {
                const factoryName = argData.factory.name || argData.factory.toString();
                if (factoryName.includes('Body') || factoryName.includes('body')) {
                  hasBody = true;
                }
                if (factoryName.includes('Headers') || factoryName.includes('headers')) {
                  hasHeaders = true;
                }
              }
            }
          });
          
          // Method 2: Check parameter types directly
          const paramTypes = Reflect.getMetadata('design:paramtypes', handler) || [];
          paramTypes.forEach((paramType: any, index: number) => {
            // Check if this parameter has @Body() decorator by checking route args
            const routeArgKey = Object.keys(routeArgs).find(k => k.startsWith(`${index}:`));
            if (routeArgKey) {
              const argData = routeArgs[routeArgKey];
              if (argData?.data === 'body' || argData?.data === '') {
                hasBody = true;
                bodyType = paramType?.name || 'object';
              }
            }
          });
          
          // Method 3: Infer from HTTP method (POST, PUT, PATCH typically have bodies)
          if (!hasBody && (httpMethod === RequestMethod.POST || httpMethod === RequestMethod.PUT || httpMethod === RequestMethod.PATCH)) {
            hasBody = true; // Likely has body
          }
          
          // Determine body type
          let bodyInfo = apiBody?.type || apiBody?.schema || apiBody || bodyType;
          if (!bodyInfo && hasBody) {
            // If body exists but no type info, mark it as present
            bodyInfo = 'object';
          }
          
          // Determine headers
          let headersInfo = allHeaders.length > 0 ? allHeaders : undefined;
          if (!headersInfo && hasHeaders) {
            // If headers exist but no Swagger metadata, mark it as present
            headersInfo = [{ name: 'headers', type: 'object', required: false }];
          }

          if (routePath !== undefined && httpMethod !== undefined) {
            const fullPath = normalizePath(controllerPath, routePath);
            
            // Skip introspection routes (case-insensitive)
            if (fullPath.toLowerCase().includes('introspection') || fullPath.toLowerCase().startsWith('/__introspection')) {
              console.log(`[ApisIntrospector]   ⏭️  Skipping introspection route: ${fullPath}`);
              continue;
            }
            
            const mappedMethod = this.mapMethod(httpMethod);
            const routeInfo = {
              controller: controllerName,
              methodName,
              httpMethod: mappedMethod,
              path: fullPath,
              params: apiParams.filter((p: any) => p?.in === 'path'),
              queries: apiParams.filter((p: any) => p?.in === 'query'),
              body: bodyInfo || (hasBody ? 'object' : undefined),
              headers: headersInfo || (hasHeaders ? [{ name: 'headers', type: 'object' }] : undefined),
              requiresAuth: requiresAuth || false,
              authType: authType || (requiresAuth ? 'Bearer' : undefined),
            };
            
            // Debug logging for detection
            console.log(`[ApisIntrospector]   🔍 Detection for ${fullPath}:`);
            console.log(`[ApisIntrospector]      - Guards found: ${allGuards.length} (method: ${methodGuards.length}, controller: ${controllerGuards.length})`);
            console.log(`[ApisIntrospector]      - Has Auth Guard: ${hasAuthGuard}`);
            console.log(`[ApisIntrospector]      - ApiBearerAuth: ${!!apiBearerAuth || swaggerBearerAuth}`);
            console.log(`[ApisIntrospector]      - Requires Auth: ${routeInfo.requiresAuth}`);
            console.log(`[ApisIntrospector]      - Auth Type: ${routeInfo.authType}`);
            console.log(`[ApisIntrospector]      - Has Body: ${hasBody}`);
            console.log(`[ApisIntrospector]      - Body Info: ${JSON.stringify(routeInfo.body)}`);
            console.log(`[ApisIntrospector]      - Has Headers: ${hasHeaders}`);
            console.log(`[ApisIntrospector]      - Headers Info: ${JSON.stringify(routeInfo.headers)}`);
            
            console.log(`[ApisIntrospector]   ✅ Route: ${Array.isArray(mappedMethod) ? mappedMethod.join(',') : mappedMethod} ${fullPath} (${methodName})`);
            if (routeInfo.requiresAuth) {
              console.log(`[ApisIntrospector]      🔐 Auth: Required (${routeInfo.authType || 'Guard'})`);
            }
            if (routeInfo.params.length > 0) {
              console.log(`[ApisIntrospector]      📍 Params: ${JSON.stringify(routeInfo.params.map((p: any) => p.name))}`);
            }
            if (routeInfo.queries.length > 0) {
              console.log(`[ApisIntrospector]      🔍 Queries: ${JSON.stringify(routeInfo.queries.map((q: any) => q.name))}`);
            }
            if (routeInfo.headers && routeInfo.headers.length > 0) {
              console.log(`[ApisIntrospector]      📋 Headers: ${JSON.stringify(routeInfo.headers.map((h: any) => h.name || h))}`);
            }
            if (routeInfo.body) {
              console.log(`[ApisIntrospector]      📦 Body: ${typeof routeInfo.body === 'string' ? routeInfo.body : JSON.stringify(routeInfo.body)}`);
            }
            
            routes.push(routeInfo);
          } else {
            console.log(`[ApisIntrospector]   ⏭️  Skipping ${methodName}: no route metadata`);
          }
        }
      }
    }

    // Final filter to ensure no introspection routes slip through
    const filteredRoutes = routes.filter(route => {
      const pathLower = route.path.toLowerCase();
      const controllerLower = route.controller.toLowerCase();
      const shouldExclude = 
        pathLower.includes('introspection') || 
        pathLower.startsWith('/__introspection') ||
        controllerLower.includes('introspection');
      
      if (shouldExclude) {
        console.log(`[ApisIntrospector] 🚫 Final filter: Removing introspection route - ${route.controller} ${route.path}`);
      }
      
      return !shouldExclude;
    });

    console.log(`[ApisIntrospector] ✅ Introspection complete. Found ${filteredRoutes.length} route(s) total (filtered from ${routes.length})`);
    return filteredRoutes;
  }

  private mapMethod(method: RequestMethod | string | number | Array<RequestMethod | string | number>): string | string[] {
    const toLabel = (value: RequestMethod | string | number): string => {
      const map: Record<number, string> = {
        [RequestMethod.GET]: 'GET',
        [RequestMethod.POST]: 'POST',
        [RequestMethod.PUT]: 'PUT',
        [RequestMethod.DELETE]: 'DELETE',
        [RequestMethod.PATCH]: 'PATCH',
        [RequestMethod.ALL]: 'ALL',
        [RequestMethod.OPTIONS]: 'OPTIONS',
        [RequestMethod.HEAD]: 'HEAD',
      };
      return map[value as number] || String(value).toUpperCase();
    };

    if (Array.isArray(method)) {
      return method.map((m) => toLabel(m));
    }
    return toLabel(method);
  }
}

function normalizePath(
  controllerPath: string | undefined,
  routePath: string | string[]
): string {
  const route = Array.isArray(routePath) ? routePath[0] : routePath;
  const base = controllerPath || '';
  const combined = `${base}/${route}`
    .replace(/\\+/g, '/')
    .replace(/\/{2,}/g, '/');
  return combined.startsWith('/') ? combined : `/${combined}`;
}
