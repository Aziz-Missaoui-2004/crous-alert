import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Seules les pages privées ont besoin de vérifier la session.
  // Les pages d'authentification restent ainsi accessibles même si Supabase
  // répond lentement ou est momentanément indisponible.
  matcher: ["/", "/admin/:path*"],
};
