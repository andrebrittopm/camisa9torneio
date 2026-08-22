import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireAdmin } from "./server/av-admin-auth.server";

export const exportProductionXlsx = createServerFn({ method: 'POST' })
  .handler(async () => {
    const request = getRequest();
    if (!request) throw new Error('Request Context Missing');
    
    await requireAdmin(request);

    const { generateProductionWorkbookInternal } = await import("./server/av-admin-export.server");
    const result = await generateProductionWorkbookInternal();

    if (!result) {
      return {
        success: false,
        code: 'NO_ELIGIBLE_ORDERS'
      };
    }

    return {
      success: true,
      ...result
    };
  });
