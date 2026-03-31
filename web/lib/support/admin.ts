import { NextRequest, NextResponse } from "next/server";

const ENABLED = process.env.FAIVR_ENABLE_SUPPORT_ADMIN === "true";
const ADMIN_TOKEN = process.env.FAIVR_SUPPORT_ADMIN_TOKEN;

export function isSupportAdminEnabled() {
  return ENABLED && Boolean(ADMIN_TOKEN);
}

export function isAuthorizedSupportAdminRequest(req: NextRequest) {
  if (!isSupportAdminEnabled() || !ADMIN_TOKEN) {
    return false;
  }

  const bearerToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const headerToken = req.headers.get("x-faivr-admin-token");

  return bearerToken === ADMIN_TOKEN || headerToken === ADMIN_TOKEN;
}

export function supportAdminDisabledResponse() {
  return NextResponse.json(
    {
      error:
        "Support admin is disabled in this deployment. Configure FAIVR_ENABLE_SUPPORT_ADMIN=true and FAIVR_SUPPORT_ADMIN_TOKEN on the server to enable it.",
    },
    { status: 403 },
  );
}

export function supportAdminUnauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
