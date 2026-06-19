"use server"

import * as db from "@/lib/db";
import { revalidatePath } from "next/cache";

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
  status_id?: number | null
}) {
  await db.addLog(req);
  revalidatePath(`/shipment/${req.shipment_id}`);
  revalidatePath("/");
}

export async function updateShipmentStatus(shipment_id: number, status_id: number) {
  await db.updateShipmentStatus(shipment_id, status_id);
  revalidatePath("/");
  revalidatePath(`/shipment/${shipment_id}`);
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

export async function resetDatabase() {
  await db.clearDatabase();
  revalidatePath("/");
}

export async function seedDatabase() {
  await db.seedDemoData();
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

export async function updateCarrier(id: number, fields: any) {
  await db.updateCarrier(id, fields);
  revalidatePath("/");
  revalidatePath("/operations");
}

export async function deleteCarrier(id: number) {
  await db.deleteCarrier(id);
  revalidatePath("/");
  revalidatePath("/operations");
}

export async function getFullBackupData() {
  const shipments = await db.getShipments();
  const carriers = await db.getCarriers();
  const statuses = await db.getStatuses();
  const customers = await db.getCustomers();
  const tasks = await db.getTasks();
  const ratesheets = await db.getRatesheets();
  const config = await db.getAppConfig();
  const logs = await db.getAllLogs();
  
  // Custom system settings from logs
  const system_store = {
    SYSTEM_CARRIERS: carriers,
    SYSTEM_STATUSES: await db.getStatuses(),
    SYSTEM_CUSTOMERS: customers,
    SYSTEM_CONFIG: config,
    SYSTEM_SHIPMENT_STATUSES: await db.supabase
      .from("logs")
      .select("event_text")
      .eq("shipment_id", 999999)
      .eq("amount_type", "SYSTEM_SHIPMENT_STATUSES")
      .maybeSingle()
      .then(res => res.data && res.data.event_text ? JSON.parse(res.data.event_text) : {})
  };

  return {
    version: "1.0",
    backup_date: new Date().toISOString(),
    shipments,
    carriers,
    statuses,
    customers,
    tasks,
    ratesheets,
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
}




