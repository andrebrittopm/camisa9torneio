import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "./server/av-admin-auth.server";

export const exportProductionXlsx = createServerFn({ method: 'POST' })
  .handler(async ({ request }) => {
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
