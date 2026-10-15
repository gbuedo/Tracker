import { Shipment, Status } from "./types";

export interface SendEmailPayload {
  to: string[] | string;
  shipment: Shipment;
  logText: string;
  statusName?: string;
  statusColor?: string;
  apiKey?: string;
  senderName?: string;
  senderEmail?: string;
  baseUrl?: string;
}

export interface EmailSendResult {
  success: boolean;
  status: 'sent' | 'no_recipient' | 'simulated' | 'error';
  recipients: string[];
  messageId?: string;
  error?: string;
}

/**
 * Validates and extracts unique email addresses from a string or array
 */
export function parseEmailList(input: string | string[] | undefined | null): string[] {
  if (!input) return [];
  const rawList = Array.isArray(input) ? input : String(input).split(/[,;]+/);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  const unique = new Set<string>();
  for (const item of rawList) {
    const cleaned = item.trim();
    if (cleaned && emailRegex.test(cleaned)) {
      unique.add(cleaned.toLowerCase());
    }
  }
  return Array.from(unique);
}

/**
 * Strips internal tags like ||STATUS_ID:xx|| from log text for client display
 */
export function cleanLogTextForClient(text: string): string {
  if (!text) return "";
  return text.replace(/\|\|STATUS_ID:\d+\|\|/g, "").trim();
}

/**
 * Builds a clean, professional, responsive HTML email.
 * STRICT SECURITY: Zero amounts, zero internal costs/sales, zero rate breakdowns.
 */
export function buildTrackingUpdateEmailHtml(payload: {
  shipment: Shipment;
  cleanLogText: string;
  statusName?: string;
  statusColor?: string;
  portalUrl: string;
}): string {
  const { shipment, cleanLogText, statusName, statusColor, portalUrl } = payload;
  const accentColor = statusColor || "#38bdf8";
  const displayStatus = statusName || shipment.status?.name || "Actualización de Seguimiento";

  const safeFields = [
    { label: "Modo de Transporte", value: shipment.transport_mode || "Aéreo / Courier" },
    { label: "Bultos (PCS)", value: shipment.pcs ? `${shipment.pcs} pcs` : null },
    { label: "Peso Bruto (KGS)", value: shipment.kgs ? `${shipment.kgs} kg` : null },
    { label: "Volumen (CHW)", value: shipment.chw ? `${shipment.chw}` : null },
    { label: "Guía HAWB / BL", value: shipment.expo_hawb || null },
    { label: "Guía Master (MAWB)", value: shipment.expo_mawb || null },
    { label: "Fecha Estimada Salida (ETD)", value: shipment.etd ? shipment.etd.split("T")[0] : null },
    { label: "Fecha Estimada Arribo (ETA)", value: shipment.eta ? shipment.eta.split("T")[0] : null },
  ].filter(f => f.value !== null);

  const fieldsHtml = safeFields.map(f => `
    <tr>
      <td style="padding: 8px 12px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #f1f5f9; width: 45%;">
        ${f.label}
      </td>
      <td style="padding: 8px 12px; font-size: 13px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9;">
        ${f.value}
      </td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Actualización de Embarque - ${shipment.reference}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);" cellspacing="0" cellpadding="0">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 28px; border-bottom: 3px solid ${accentColor};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">
                      WCS TRACKER &bull; LOGISTICS NOTIFICATION
                    </div>
                    <div style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                      Embarque: ${shipment.reference}
                    </div>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: ${accentColor}20; color: ${accentColor}; border: 1px solid ${accentColor}60; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 6px 12px; border-radius: 9999px; letter-spacing: 0.5px;">
                      ${displayStatus}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 28px;">
              <!-- Client Greeting -->
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">
                Estimado/a cliente de <strong>${shipment.client_name}</strong>,
              </p>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #334155; line-height: 1.5;">
                Le informamos una nueva actualización operativa registrada sobre su embarque en seguimiento:
              </p>

              <!-- Event Highlight Box -->
              <div style="background-color: #f8fafc; border-left: 4px solid ${accentColor}; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                  Último Hito Operativo
                </div>
                <div style="font-size: 15px; font-weight: 600; color: #0f172a; line-height: 1.5;">
                  ${cleanLogText || displayStatus}
                </div>
              </div>

              <!-- Operational Details Table -->
              <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
                Ficha del Embarque
              </div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #f1f5f9; border-radius: 8px; margin-bottom: 28px; background-color: #ffffff;">
                ${fieldsHtml}
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${portalUrl}" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 14px 28px; border-radius: 10px; letter-spacing: 0.5px; box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);">
                      Ver Línea de Tiempo en Vivo &rarr;
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 28px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #94a3b8;">
                Este es un mensaje automático generado por <strong>WCS Tracker</strong>. Por favor, no responda directamente a este correo.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                Para consultas operativas adicionales, contacte a su ejecutivo de cuenta asignado.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Sends tracking notification email using Resend API.
 * If no API key is provided, safely simulates the send and logs the details.
 */
export async function sendClientTrackingEmail(payload: SendEmailPayload): Promise<EmailSendResult> {
  const recipients = parseEmailList(payload.to);
  
  if (recipients.length === 0) {
    return {
      success: false,
      status: 'no_recipient',
      recipients: [],
      error: "No valid recipient email addresses configured"
    };
  }

  const cleanText = cleanLogTextForClient(payload.logText);
  const host = payload.baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const portalUrl = `${host}/portal?ref=${encodeURIComponent(payload.shipment.reference)}`;

  const htmlBody = buildTrackingUpdateEmailHtml({
    shipment: payload.shipment,
    cleanLogText: cleanText,
    statusName: payload.statusName,
    statusColor: payload.statusColor,
    portalUrl
  });

  const apiKey = payload.apiKey || process.env.RESEND_API_KEY;
  const senderName = payload.senderName || "WCS Tracker";
  const senderEmail = payload.senderEmail || "onboarding@resend.dev";
  const fromAddress = `${senderName} <${senderEmail}>`;
  const subject = `[WCS Tracker] Actualización de Embarque: ${payload.shipment.reference} (${payload.shipment.client_name})`;

  // If no API key is set, simulate safely without error
  if (!apiKey) {
    console.log(`[Email Service - Simulated] To: ${recipients.join(", ")} | Subject: "${subject}"`);
    return {
      success: true,
      status: 'simulated',
      recipients,
      messageId: `sim-${Date.now()}`
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromAddress,
        to: recipients,
        subject,
        html: htmlBody
      })
    });

    const resData = await res.json();

    if (!res.ok) {
      const errMsg = resData?.message || resData?.error?.message || `HTTP ${res.status}`;
      console.error("[Resend API Error]:", errMsg);
      return {
        success: false,
        status: 'error',
        recipients,
        error: errMsg
      };
    }

    return {
      success: true,
      status: 'sent',
      recipients,
      messageId: resData?.id
    };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.error("[Email Dispatch Exception]:", errMsg);
    return {
      success: false,
      status: 'error',
      recipients,
      error: errMsg
    };
  }
}
