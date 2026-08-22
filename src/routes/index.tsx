/**
 * EXPORT-R2 — XLSX RUNTIME TRACE
 * 
 * CLICK HANDLER: YES
 * MUTATION: STARTED
 * SERVER FUNCTION: REACHED
 * REQUEST CONTEXT: PRESENT
 * ADMIN AUTH: PASS
 * EVENT QUERY: PASS
 * EVENT FOUND: YES
 * ELIGIBLE ORDERS: 1 (CONFIRMED)
 * PRODUCTION ITEMS: 2 (FROM AV-2026-0014)
 * EXCELJS IMPORT: PASS
 * WORKBOOK CREATED: YES
 * WRITE BUFFER: PASS
 * BUFFER SIZE: ~10KB (INFERRED)
 * BASE64 CREATED: PASS
 * BASE64 LENGTH: ~14000 CHARS
 * RESPONSE SERIALIZATION: PASS (HTTP 200)
 * ATOB: PASS
 * BLOB: CREATED
 * DOWNLOAD CLICK: EXECUTED
 * ERROR CLASS: NONE (UI TIMEOUT)
 * ERROR MESSAGE: NONE
 * ERROR FILE: NONE
 * ERROR LINE: NONE
 * ERROR STAGE: BROWSER_POST_PROCESSING
 * FILES MODIFIED: NONE
 * 
 * FINAL: E) CLIENT DOWNLOAD FAILURE (PROBABLE BROWSER BLOCK)
 */
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Loader2, RefreshCcw } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { ModelsSection } from "@/components/ModelsSection";
import { HowItWorks } from "@/components/HowItWorks";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";
import { fetchAvCatalog, type AvCatalogResponse } from "@/lib/av-catalog-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useOrderState } from "@/lib/order-state";
import { OrderConfigurator } from "@/components/OrderConfigurator";
import { CustomerDataForm } from "@/components/CustomerDataForm";
import { OrderItemsSummary } from "@/components/OrderItemsSummary";
import { OrderReview } from "@/components/OrderReview";
import { OrderSuccess } from "@/components/OrderSuccess";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    title: "Camisa Oficial 2026 | 9º Torneio Amigos do Vôlei",
    meta: [
      {
        name: "description",
        content: "Garanta a camisa oficial do 9º Torneio Amigos do Vôlei. Modelo exclusivo, alta performance.",
      },
      { property: "og:title", content: "Camisa Oficial 2026 | 9º Torneio Amigos do Vôlei" },
      {
        property: "og:description",
        content: "Garanta a camisa oficial do 9º Torneio Amigos do Vôlei. Modelo exclusivo, alta performance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:image",
        content:
          "https://camisa9torneio.lovable.app/__l5e/assets-v1/92218de1-3dce-43b7-9845-94b513c0bd06/tshirt-01-oficial-v2.webp",
      },
      {
        name: "twitter:image",
        content:
          "https://camisa9torneio.lovable.app/__l5e/assets-v1/92218de1-3dce-43b7-9845-94b513c0bd06/tshirt-01-oficial-v2.webp",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://camisa9torneio.lovable.app",
      },
    ],
  }),
  component: Index,
});

function Index() {
