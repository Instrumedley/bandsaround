declare module "next-auth/core" {
  type AuthHandlerParams = {
    req: {
      body?: Record<string, unknown>;
      query: Record<string, unknown>;
      cookies: Record<string, string>;
      headers: Record<string, string>;
      method: string;
      action: string;
      providerId?: string;
      error?: string;
    };
    options: Record<string, unknown>;
  };

  type AuthHandlerResponse = {
    status?: number;
    headers?: Array<{ key: string; value: string }>;
    body?: unknown;
    redirect?: string;
    cookies?: Array<{
      name: string;
      value: string;
      options: Record<string, unknown>;
    }>;
  };

  export function AuthHandler(params: AuthHandlerParams): Promise<AuthHandlerResponse>;
}
