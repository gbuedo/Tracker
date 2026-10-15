"use server"

import * as db from "@/lib/db";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { sendClientTrackingEmail, parseEmailList } from "@/lib/email";
import { EmailSettings, LogEmailNotification } from "@/lib/types";

async function triggerLogEmailNotification(
  shipmentId: number, 
  logId: string, 
  eventText: string, 
  statusId?: number | null
): Promise<void> {
  try {
    const shipment = await db.getShipmentById(shipmentId);
    if (!shipment || !shipment.client_name) return;

    const clientEmailsMap = await db.getClientEmails();
    const rawEmails = clientEmailsMap[shipment.client_name] || "";
    const validRecipients = parseEmailList(rawEmails);

    // Rule: If customer has no email configured, do nothing (record status)
    if (validRecipients.length === 0) {
      await db.recordLogEmailNotification(logId, {
        sent: false,
        status: 'no_recipient'
      });
      return;
    }

    const emailSettings = await db.getEmailSettings();
    const allStatuses = await db.getStatuses();
    const currentStatus = statusId 
      ? allStatuses.find(s => s.id === statusId) 
      : shipment.status;

    const sendResult = await sendClientTrackingEmail({
      to: validRecipients,
      shipment,
      logText: eventText,
      statusName: currentStatus?.name,
      statusColor: currentStatus?.color_code,
      apiKey: emailSettings.resend_api_key,
      senderName: emailSettings.sender_name,
      senderEmail: emailSettings.sender_email
    });

    await db.recordLogEmailNotification(logId, {
      sent: sendResult.success,
      sent_at: new Date().toISOString(),
      recipients: sendResult.recipients,
      status: sendResult.status,
      error_message: sendResult.error
    });
  } catch (err: any) {
    console.error("Failed in triggerLogEmailNotification:", err);
    await db.recordLogEmailNotification(logId, {
      sent: false,
      sent_at: new Date().toISOString(),
      status: 'error',
      error_message: err?.message || String(err)
    });
  }
}

export async function createShipment(formData: FormData) {
  const client_name = formData.get("client_name") as string;
  const reference = formData.get("reference") as string;
  const shipment_type = formData.get("shipment_type") as string;
  const transport_mode = formData.get("transport_mode") as string || null;
  
  const status_id = formData.get("status_id") ? Number(formData.get("status_id")) : null;
  const pcs = formData.get("pcs") ? Number(formData.get("pcs")) : null;
  const kgs = formData.get("kgs") ? Number(formData.get("kgs")) : null;
  const chw = formData.get("chw") ? Number(formData.get("chw")) : null;
  const expo_mawb = formData.get("expo_mawb") as string || null;
  const expo_hawb = formData.get("expo_hawb") as string || null;
  const warehouse_receipt = formData.get("warehouse_receipt") as string || null;
  const ct_file = formData.get("ct_file") as string || null;
  const aes = formData.get("aes") as string || null;
  const consolidation_awb = formData.get("consolidation_awb") as string || null;
  const etd = formData.get("etd") as string || null;
  const eta = formData.get("eta") as string || null;

  const data = await db.createShipment(client_name, reference, shipment_type, {
    status_id,
    transport_mode,
    pcs,
    kgs,
    chw,
    expo_mawb,
    expo_hawb,
    warehouse_receipt,
    ct_file,
    aes,
    consolidation_awb,
    etd,
    eta
  });

  revalidatePath("/");
  return data;
}

export async function updateShipment(
  id: number,
  fields: {
    client_name?: string;
    reference?: string;
    shipment_type?: string;
    transport_mode?: string | null;
    status_id?: number;
    eta?: string | null;
    etd?: string | null;
    ct_file?: string | null;
    warehouse_receipt?: string | null;
    expo_mawb?: string | null;
    expo_hawb?: string | null;
    pcs?: number | null;
    kgs?: number | null;
    chw?: number | null;
    aes?: string | null;
    consolidation_awb?: string | null;
  }
) {
  const data = await db.updateShipment(id, fields);
  revalidatePath("/");
  revalidatePath(`/shipment/${id}`);
  return data;
}

export async function createBillableConcept(name: string, description?: string) {
  const data = await db.createBillableConcept(name, description);
  revalidatePath("/");
  return data;
}

export async function addLog(req: { 
  shipment_id: number, 
  event_text: string, 
  is_external: boolean, 
  billable_concept_id?: number | null, 
  amount?: number | null,
  amount_type?: 'cost' | 'selling' | null,
  status_id?: number | null,
  skipSyncStatus?: boolean
}) {
  const result = await db.addLog(req);

  // Automated Email Notification for External Logs (non-blocking)
  if (req.is_external && result?.id) {
    triggerLogEmailNotification(req.shipment_id, result.id, req.event_text, req.status_id).catch(err => {
      console.error("[Email Notification Trigger Exception]:", err);
    });
  }

  revalidatePath(`/shipment/${req.shipment_id}`);
  revalidatePath("/");
  return result;
}

export async function updateShipmentStatus(shipment_id: number, status_id: number) {
  await db.updateShipmentStatus(shipment_id, status_id);
  revalidatePath("/");
  revalidatePath(`/shipment/${shipment_id}`);
}

export async function toggleShipmentFlag(id: number) {
  const isFlagged = await db.toggleShipmentFlag(id);
  revalidatePath("/");
  revalidatePath("/operations");
  revalidatePath(`/shipment/${id}`);
  return isFlagged;
}

export async function splitShipment(parent_id: number, splitDetails: any) {
  const data = await db.splitShipment(parent_id, splitDetails);
  
  revalidatePath("/");
  revalidatePath(`/shipment/${parent_id}`);
  return data;
}

export async function searchPortalShipment(search: string) {
  const result = await db.searchPortalShipment(search);
  const isDemoMode = db.checkIsDemoMode();
  return {
    result,
    isDemoMode
  };
}

export async function getCustomers() {
  return await db.getCustomers();
}

export async function addCustomer(name: string) {
  await db.addCustomer(name);
  revalidatePath("/");
}

export async function addStatus(name: string, color_code: string, sort_order: number) {
  await db.addStatus(name, color_code, sort_order);
  revalidatePath("/");
}

export async function deleteStatus(id: number) {
  await db.deleteStatus(id);
  revalidatePath("/");
}

export async function getAppConfig() {
  return await db.getAppConfig();
}

export async function updateAppConfig(config: { next_shipment_id: number }) {
  await db.updateAppConfig(config);
  revalidatePath("/");
}

export async function deleteShipment(id: number) {
  await db.deleteShipment(id);
  revalidatePath("/");
}

export async function updateLog(
  id: string,
  shipmentId: number,
  fields: {
    event_text?: string;
    is_external?: boolean;
    amount?: number | null;
    amount_type?: 'cost' | 'selling' | null;
  }
) {
  await db.updateLog(id, fields);
  revalidatePath(`/shipment/${shipmentId}`);
  revalidatePath("/");
}

export async function deleteLog(id: string, shipmentId: number) {
  await db.deleteLog(id);
  revalidatePath(`/shipment/${shipmentId}`);
  revalidatePath("/");
}

export async function addCarrier(code: string, name: string, extraFields: any = {}) {
  await db.addCarrier(code, name, extraFields);
  revalidatePath("/");
  revalidatePath("/operations");
}

export async function updateCarrier(id: number, fields: any, shipmentId?: number) {
  await db.updateCarrier(id, fields);
  revalidatePath("/");
  revalidatePath("/operations");
  if (shipmentId) {
    revalidatePath(`/shipment/${shipmentId}`);
  }
}

export async function deleteCarrier(id: number) {
  await db.deleteCarrier(id);
  revalidatePath("/");
  revalidatePath("/operations");
}

export async function getFullBackupData() {
  const shipments = await db.getShipments();
  const carriers = await db.getCarriers();
  const overseas_agents = await db.getOverseasAgents();
  const statuses = await db.getStatuses();
  const customers = await db.getCustomers();
  const tasks = await db.getTasks();
  const ratesheets = await db.getRatesheets();
  const billable_concepts = await db.getBillableConcepts();
  const config = await db.getAppConfig();
  const logs = await db.getAllLogs();
  const system_store = await db.getFullSystemStore();

  // Guarantee system_store contains latest snapshot of master arrays
  system_store.SYSTEM_CARRIERS = carriers;
  system_store.SYSTEM_OVERSEAS_AGENTS = overseas_agents;
  system_store.SYSTEM_CUSTOMERS = customers;
  system_store.SYSTEM_CONFIG = config;
  system_store.SYSTEM_TASKS = tasks;
  system_store.SYSTEM_BILLABLE_CONCEPTS = billable_concepts;
  system_store.SYSTEM_STATUSES = statuses;

  return {
    version: "2.0",
    backup_date: new Date().toISOString(),
    total_shipments: shipments.length,
    total_logs: logs.length,
    shipments,
    carriers,
    overseas_agents,
    statuses,
    customers,
    tasks,
    ratesheets,
    billable_concepts,
    config,
    logs,
    system_store
  };
}

export async function importFullBackupAction(backup: any) {
  await db.importFullBackup(backup);
  revalidatePath("/");
  revalidatePath("/operations");
  revalidatePath("/task-tracker");
  revalidatePath("/ratesheet-tracker");
  revalidatePath("/shipping-instructions");
  revalidatePath("/portal");
}

export async function getShipmentNotes(id: number) {
  return await db.getShipmentNotes(id);
}

export async function saveShipmentNotes(id: number, notes: string) {
  const data = await db.saveShipmentNotes(id, notes);
  revalidatePath(`/shipment/${id}`);
  return data;
}

// ----------------------------------------------------
// OVERSEAS AGENTS ACTIONS
// ----------------------------------------------------

export async function saveOverseasAgentAction(agent: any) {
  const data = await db.saveOverseasAgent(agent);
  revalidatePath("/shipping-instructions");
  return data;
}

export async function deleteOverseasAgentAction(id: string) {
  const data = await db.deleteOverseasAgent(id);
  revalidatePath("/shipping-instructions");
  return data;
}

// ----------------------------------------------------
// CLIENT NOTIFICATION EMAILS & EMAIL SETTINGS ACTIONS
// ----------------------------------------------------

export async function getClientEmailsAction() {
  return await db.getClientEmails();
}

export async function saveClientEmailsAction(mapping: Record<string, string>) {
  await db.saveClientEmails(mapping);
  revalidatePath("/");
  revalidatePath("/operations");
}

export async function saveSingleClientEmailAction(clientName: string, emails: string) {
  await db.saveSingleClientEmail(clientName, emails);
  revalidatePath("/");
  revalidatePath("/operations");
}

export async function getEmailSettingsAction() {
  return await db.getEmailSettings();
}

export async function saveEmailSettingsAction(settings: EmailSettings) {
  await db.saveEmailSettings(settings);
  revalidatePath("/");
}

export async function sendTestEmailAction(toEmail: string) {
  const settings = await db.getEmailSettings();
  const fakeShipment: any = {
    id: 9999,
    reference: "TEST-EMBARQUE-DEMO",
    client_name: "Cliente de Prueba",
    transport_mode: "Aéreo",
    pcs: 4,
    kgs: 120,
    chw: 140,
    expo_hawb: "HAWB-987654",
    eta: new Date().toISOString(),
    status: { name: "En Tránsito", color_code: "#38bdf8" }
  };

  return await sendClientTrackingEmail({
    to: toEmail,
    shipment: fakeShipment,
    logText: "Este es un correo de prueba de WCS Tracker para verificar la configuración de notificaciones automáticas.",
    statusName: "En Tránsito",
    statusColor: "#38bdf8",
    apiKey: settings.resend_api_key,
    senderName: settings.sender_name,
    senderEmail: settings.sender_email
  });
}

export async function resendLogEmailAction(shipmentId: number, logId: string) {
  const shipment = await db.getShipmentById(shipmentId);
  if (!shipment) throw new Error("Shipment not found");
  const log = (shipment.logs || []).find(l => l.id === logId);
  if (!log) throw new Error("Log not found");

  await triggerLogEmailNotification(shipmentId, logId, log.event_text, log.status_id);
  revalidatePath(`/shipment/${shipmentId}`);
  revalidatePath("/");
  return { success: true };
}





