import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";
import { renderErrorPage } from "./lib/error-page";

/**
 * ATENÇÃO: 
 * O global functionMiddleware 'attachSupabaseAuth' foi removido propositalmente 
 * para evitar interferência com o fluxo de autenticação via cookies (SSR) 
 * no ambiente administrativo.
 * 
 * O Painel Administrativo utiliza @supabase/ssr com cookies HttpOnly/SameSite=None.
 * A camada pública/cliente continua usando o cliente Supabase padrão para operações anônimas.
 */

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
