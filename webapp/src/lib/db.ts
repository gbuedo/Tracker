import { supabase } from "./supabase";
import { Shipment, Status, Log, BillableConcept } from "./types";
import fs from "fs";
import path from "path";

// Path to local mock database file
const MOCK_DB_PATH = path.join(process.cwd(), "src", "lib", "mock_db.json");

let isDemo = false;

export function checkIsDemoMode(): boolean {
  return isDemo;
}

function checkIsDefaultUrl(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !url || url.includes("placeholder");
}

// Initial seed data for the mock database
const initialMockData = {
  statuses: [
    { id: 1, name: "Quoting", color_code: "#94a3b8", sort_order: 1 },
    { id: 2, name: "Quoted", color_code: "#38bdf8", sort_order: 2 },
    { id: 3, name: "Coordinating", color_code: "#fbbf24", sort_order: 3 },
    { id: 4, name: "On the Way", color_code: "#818cf8", sort_order: 4 },
    { id: 5, name: "STAGE 2 - Completed", color_code: "#4ade80", sort_order: 5 },
    { id: 6, name: "Arrived", color_code: "#2dd4bf", sort_order: 6 },
    { id: 7, name: "Delivered", color_code: "#22c55e", sort_order: 7 },
    { id: 8, name: "Cancelled", color_code: "#f87171", sort_order: 8 }
  ],
  billable_concepts: [
    { id: 1, name: "Air Freight", description: "Standard air carriage charges" },
    { id: 2, name: "Ocean Freight", description: "Ocean container carriage charges" },
    { id: 3, name: "In & Out", description: "Warehouse handling in & out" },
    { id: 4, name: "Storage", description: "Daily warehouse storage rate" },
    { id: 5, name: "Customs Clearance", description: "Import custom broker filing fee" }
  ],
  shipments: [
    {
      id: 1,
      parent_shipment_id: null,
      client_name: "Global Logistics Inc.",
      reference: "PO-99281-AMZ",
      status_id: 6,
      shipment_type: "Import",
      eta: "2026-05-20",
      etd: "2026-05-15",
      ct_file: "CT-77492",
      warehouse_receipt: "WH-90812",
      expo_mawb: "012-99887766",
      expo_hawb: "HAWB-8812",
      pcs: 45,
      kgs: 1250.5,
      chw: 1300,
      aes: "AES-X992831",
      created_at: "2026-05-10T12:00:00.000Z",
      updated_at: "2026-05-18T10:30:00.000Z"
    },
    {
      id: 2,
      parent_shipment_id: 1,
      client_name: "Global Logistics Inc.",
      reference: "PO-99281-AMZ - SPLIT A",
      status_id: 7,
      shipment_type: "Import",
      eta: "2026-05-18",
      etd: "2026-05-15",
      ct_file: "CT-77492-A",
      warehouse_receipt: "WH-90812-A",
      expo_mawb: "012-99887766",
      expo_hawb: "HAWB-8812-A",
      pcs: 20,
      kgs: 550,
      chw: 550,
      aes: "AES-X992831",
      created_at: "2026-05-12T14:30:00.000Z",
      updated_at: "2026-05-18T09:15:00.000Z"
    },
    {
      id: 3,
      parent_shipment_id: null,
      client_name: "Global Traders Corp",
      reference: "PO-8827-GT",
      status_id: 3,
      shipment_type: "Export",
      eta: "2026-06-05",
      etd: "2026-05-28",
      ct_file: "CT-88391",
      warehouse_receipt: "WH-77382",
      expo_mawb: "016-88771122",
      expo_hawb: "HAWB-4456",
      pcs: 120,
      kgs: 4800,
      chw: 5000,
      aes: "AES-Y883921",
      created_at: "2026-05-14T09:15:00.000Z",
      updated_at: "2026-05-15T16:00:00.000Z"
    },
    {
      id: 4,
      parent_shipment_id: null,
      client_name: "InterContinental S.A.",
      reference: "PO-1102-IC",
      status_id: 8,
      shipment_type: "Transit",
      eta: "2026-05-25",
      etd: "2026-05-10",
      ct_file: "CT-11029",
      warehouse_receipt: null,
      expo_mawb: null,
      expo_hawb: null,
      pcs: 5,
      kgs: 95,
      chw: 100,
      aes: null,
      created_at: "2026-05-15T11:00:00.000Z",
      updated_at: "2026-05-15T11:00:00.000Z"
    }
  ],
  logs: [
    {
      id: "log-1",
      shipment_id: 1,
      event_text: "File created in follow-up middleware. Waiting for documentation from supplier.",
      is_external: false,
      amount: null,
      billable_concept_id: null,
      created_at: "2026-05-10T12:05:00.000Z"
    },
    {
      id: "log-2",
      shipment_id: 1,
      event_text: "Documentation received. Coordinating flight schedules with Atlas Air.",
      is_external: true,
      amount: null,
      billable_concept_id: null,
      created_at: "2026-05-11T10:00:00.000Z"
    },
    {
      id: "log-3",
      shipment_id: 1,
      event_text: "Cargo arrived at airport warehouse and inspected. In & Out fees captured.",
      is_external: false,
      amount: 150.00,
      billable_concept_id: 3,
      created_at: "2026-05-12T14:00:00.000Z"
    },
    {
      id: "log-4",
      shipment_id: 2,
      event_text: "Cargo split from master shipment #1. Dispatched for final delivery to warehouse.",
      is_external: true,
      amount: null,
      billable_concept_id: null,
      created_at: "2026-05-12T14:35:00.000Z"
    },
    {
      id: "log-5",
      shipment_id: 2,
      event_text: "Cargo successfully delivered and signed by consignee.",
      is_external: true,
      amount: null,
      billable_concept_id: null,
      created_at: "2026-05-18T09:15:00.000Z"
    },
    {
      id: "log-6",
      shipment_id: 3,
      event_text: "Shipment details uploaded. Booking slot confirmed with airline carrier.",
      is_external: true,
      amount: null,
      billable_concept_id: null,
      created_at: "2026-05-14T09:20:00.000Z"
    }
  ]
};

// Helper: Ensure the mock file exists and read it
function readMockData() {
  if (!fs.existsSync(MOCK_DB_PATH)) {
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(initialMockData, null, 2), "utf8");
  }
  try {
    const raw = fs.readFileSync(MOCK_DB_PATH, "utf8");
    const parsed = JSON.parse(raw);
    
    let migrated = false;
    if (!parsed.config) {
      const maxId = parsed.shipments && parsed.shipments.length > 0
        ? Math.max(...parsed.shipments.map((s: any) => s.id))
        : 1;
      parsed.config = { next_shipment_id: maxId + 1 };
      migrated = true;
    }
    if (!parsed.customers) {
      const clients = new Set<string>();
      if (parsed.shipments) {
        parsed.shipments.forEach((s: any) => {
          if (s.client_name) clients.add(s.client_name);
        });
      }
      if (clients.size === 0) {
        clients.add("Global Logistics Inc.");
        clients.add("Global Traders Corp");
        clients.add("InterContinental S.A.");
      }
      parsed.customers = Array.from(clients).sort();
      migrated = true;
    }
    if (migrated) {
      fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(parsed, null, 2), "utf8");
    }
    return parsed;
  } catch (e) {
    return initialMockData;
  }
}

// Helper: Write data to the mock file
function writeMockData(data: any) {
  fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Executes a Supabase query with an automatic local fallback in case of connection errors.
 */
async function queryWithFallback<T>(supabaseQuery: () => Promise<any>, fallbackFn: () => T): Promise<T> {
  const isDefaultUrl = checkIsDefaultUrl();
  if (isDemo || isDefaultUrl) {
    isDemo = true;
    return fallbackFn();
  }
  try {
    const response = await supabaseQuery();
    if (response.error) {
      throw response.error;
    }
    isDemo = false;
    return response.data as T;
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    // If it's a fetch or DNS error, or if Supabase is offline, trigger Demo mode fallback
    if (
      errMsg.includes("fetch") || 
      errMsg.includes("ENOTFOUND") || 
      errMsg.includes("getaddrinfo") ||
      isDefaultUrl
    ) {
      isDemo = true;
      return fallbackFn();
    }
    throw err;
  }
}

// ----------------------------------------------------
// PUBLIC INTERFACE METHODS
// ----------------------------------------------------

export async function getShipments(): Promise<Shipment[]> {
  return queryWithFallback(
    async () => {
      return await supabase
        .from("shipments")
        .select("*, status:statuses(*)")
        .order("created_at", { ascending: false });
    },
    () => {
      const data = readMockData();
      return data.shipments.map((s: any) => ({
        ...s,
        status: data.statuses.find((st: any) => st.id === s.status_id)
      })) as Shipment[];
    }
  );
}

export async function getShipmentById(id: number): Promise<Shipment | null> {
  return queryWithFallback(
    async () => {
      return await supabase
        .from("shipments")
        .select(`
          *,
          status:statuses(*),
          children:shipments!parent_shipment_id(*),
          logs:logs(*, billable_concept:billable_concepts(*))
        `)
        .eq("id", id)
        .single();
    },
    () => {
      const data = readMockData();
      const s = data.shipments.find((sh: any) => sh.id === id);
      if (!s) return null;

      const children = data.shipments.filter((sh: any) => sh.parent_shipment_id === id);
      const logs = data.logs
        .filter((l: any) => l.shipment_id === id)
        .map((l: any) => ({
          ...l,
          billable_concept: data.billable_concepts.find((bc: any) => bc.id === l.billable_concept_id)
        }));

      return {
        ...s,
        status: data.statuses.find((st: any) => st.id === s.status_id),
        children,
        logs
      } as Shipment;
    }
  );
}

export async function createShipment(
  client_name: string, 
  reference: string, 
  shipment_type: string,
  extra: {
    pcs?: number | null;
    kgs?: number | null;
    chw?: number | null;
    expo_mawb?: string | null;
    expo_hawb?: string | null;
    warehouse_receipt?: string | null;
    ct_file?: string | null;
    aes?: string | null;
    etd?: string | null;
    eta?: string | null;
  } = {}
): Promise<Shipment> {
  const isDefaultUrl = checkIsDefaultUrl();
  if (isDemo || isDefaultUrl) {
    isDemo = true;
    const data = readMockData();
    if (!data.config) data.config = {};
    const newId = Number(data.config.next_shipment_id) || (data.shipments.length > 0 ? Math.max(...data.shipments.map((s: any) => s.id)) + 1 : 1);
    data.config.next_shipment_id = newId + 1;
    
    const newShipment = {
      id: newId,
      parent_shipment_id: null,
      client_name,
      reference,
      status_id: 1, // Quoting
      shipment_type,
      eta: extra.eta || null,
      etd: extra.etd || null,
      ct_file: extra.ct_file || null,
      warehouse_receipt: extra.warehouse_receipt || null,
      expo_mawb: extra.expo_mawb || null,
      expo_hawb: extra.expo_hawb || null,
      pcs: extra.pcs || null,
      kgs: extra.kgs || null,
      chw: extra.chw || null,
      aes: extra.aes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    data.shipments.push(newShipment);
    writeMockData(data);
    return newShipment as Shipment;
  }
  try {
    // Attempt Supabase
    const { data, error } = await supabase.from("shipments").insert({
      client_name,
      reference,
      shipment_type,
      status_id: 1, // Quoting
      eta: extra.eta || null,
      etd: extra.etd || null,
      ct_file: extra.ct_file || null,
      warehouse_receipt: extra.warehouse_receipt || null,
      expo_mawb: extra.expo_mawb || null,
      expo_hawb: extra.expo_hawb || null,
      pcs: extra.pcs || null,
      kgs: extra.kgs || null,
      chw: extra.chw || null,
      aes: extra.aes || null,
    }).select().single();

    if (error) throw error;
    isDemo = false;
    return data as Shipment;
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.includes("fetch") || errMsg.includes("ENOTFOUND") || errMsg.includes("getaddrinfo")) {
      isDemo = true;
      const data = readMockData();
      const newId = data.shipments.length > 0 ? Math.max(...data.shipments.map((s: any) => s.id)) + 1 : 1;
      
      const newShipment = {
        id: newId,
        parent_shipment_id: null,
        client_name,
        reference,
        status_id: 1, // Quoting
        shipment_type,
        eta: extra.eta || null,
        etd: extra.etd || null,
        ct_file: extra.ct_file || null,
        warehouse_receipt: extra.warehouse_receipt || null,
        expo_mawb: extra.expo_mawb || null,
        expo_hawb: extra.expo_hawb || null,
        pcs: extra.pcs || null,
        kgs: extra.kgs || null,
        chw: extra.chw || null,
        aes: extra.aes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      data.shipments.push(newShipment);
      writeMockData(data);
      return newShipment as Shipment;
    }
    throw err;
  }
}

export async function addLog(req: { 
  shipment_id: number, 
  event_text: string, 
  is_external: boolean, 
  billable_concept_id?: number | null, 
  amount?: number | null,
  amount_type?: 'cost' | 'selling' | null
}): Promise<void> {
  const isDefaultUrl = checkIsDefaultUrl();
  if (isDemo || isDefaultUrl) {
    isDemo = true;
    const data = readMockData();
    
    const newLog = {
      id: `log-${Date.now()}`,
      shipment_id: req.shipment_id,
      event_text: req.event_text,
      is_external: req.is_external,
      billable_concept_id: req.billable_concept_id || null,
      amount: req.amount || null,
      amount_type: req.amount_type || null,
      created_at: new Date().toISOString()
    };

    data.logs.push(newLog);
    
    // Also update parent shipment's updated_at
    const shipment = data.shipments.find((s: any) => s.id === req.shipment_id);
    if (shipment) {
      shipment.updated_at = new Date().toISOString();
    }

    writeMockData(data);
    return;
  }
  try {
    const { error } = await supabase.from("logs").insert(req);
    if (error) throw error;
    isDemo = false;
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.includes("fetch") || errMsg.includes("ENOTFOUND") || errMsg.includes("getaddrinfo")) {
      isDemo = true;
      const data = readMockData();
      
      const newLog = {
        id: `log-${Date.now()}`,
        shipment_id: req.shipment_id,
        event_text: req.event_text,
        is_external: req.is_external,
        billable_concept_id: req.billable_concept_id || null,
        amount: req.amount || null,
        amount_type: req.amount_type || null,
        created_at: new Date().toISOString()
      };

      data.logs.push(newLog);
      
      // Also update parent shipment's updated_at
      const shipment = data.shipments.find((s: any) => s.id === req.shipment_id);
      if (shipment) {
        shipment.updated_at = new Date().toISOString();
      }

      writeMockData(data);
      return;
    }
    throw err;
  }
}

export async function updateShipmentStatus(shipment_id: number, status_id: number): Promise<void> {
  const isDefaultUrl = checkIsDefaultUrl();
  if (isDemo || isDefaultUrl) {
    isDemo = true;
    const data = readMockData();
    const shipment = data.shipments.find((s: any) => s.id === shipment_id);
    if (shipment) {
      shipment.status_id = status_id;
      shipment.updated_at = new Date().toISOString();
      writeMockData(data);
    }
    return;
  }
  try {
    const { error } = await supabase.from("shipments").update({ status_id }).eq("id", shipment_id);
    if (error) throw error;
    isDemo = false;
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.includes("fetch") || errMsg.includes("ENOTFOUND") || errMsg.includes("getaddrinfo")) {
      isDemo = true;
      const data = readMockData();
      const shipment = data.shipments.find((s: any) => s.id === shipment_id);
      if (shipment) {
        shipment.status_id = status_id;
        shipment.updated_at = new Date().toISOString();
        writeMockData(data);
      }
      return;
    }
    throw err;
  }
}

export async function splitShipment(parent_id: number, splitDetails: any): Promise<Shipment> {
  const isDefaultUrl = checkIsDefaultUrl();
  if (isDemo || isDefaultUrl) {
    isDemo = true;
    const data = readMockData();
    const parent = data.shipments.find((s: any) => s.id === parent_id);
    if (!parent) throw new Error("Parent shipment not found");

    const newId = data.shipments.length > 0 ? Math.max(...data.shipments.map((s: any) => s.id)) + 1 : 1;
    const newChild = {
      ...parent,
      id: newId,
      parent_shipment_id: parent.id,
      reference: parent.reference + " - SPLIT",
      pcs: splitDetails.pcs || parent.pcs,
      kgs: splitDetails.kgs || parent.kgs,
      chw: splitDetails.chw || parent.chw,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    data.shipments.push(newChild);
    writeMockData(data);
    return newChild as Shipment;
  }
  try {
    const { data: parent, error: pError } = await supabase.from("shipments").select("*").eq("id", parent_id).single();
    if (pError || !parent) throw new Error("Parent shipment not found");

    const childData = {
      ...parent,
      id: undefined,
      parent_shipment_id: parent.id,
      reference: parent.reference + " - SPLIT",
      ...splitDetails
    };

    const { data, error } = await supabase.from("shipments").insert(childData).select().single();
    if (error) throw error;
    isDemo = false;
    return data as Shipment;
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.includes("fetch") || errMsg.includes("ENOTFOUND") || errMsg.includes("getaddrinfo")) {
      isDemo = true;
      const data = readMockData();
      const parent = data.shipments.find((s: any) => s.id === parent_id);
      if (!parent) throw new Error("Parent shipment not found");

      const newId = data.shipments.length > 0 ? Math.max(...data.shipments.map((s: any) => s.id)) + 1 : 1;
      const newChild = {
        ...parent,
        id: newId,
        parent_shipment_id: parent.id,
        reference: parent.reference + " - SPLIT",
        pcs: splitDetails.pcs || parent.pcs,
        kgs: splitDetails.kgs || parent.kgs,
        chw: splitDetails.chw || parent.chw,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      data.shipments.push(newChild);
      writeMockData(data);
      return newChild as Shipment;
    }
    throw err;
  }
}

export async function getStatuses(): Promise<Status[]> {
  return queryWithFallback(
    async () => {
      return await supabase.from("statuses").select("*").order("sort_order", { ascending: true });
    },
    () => {
      return readMockData().statuses as Status[];
    }
  );
}

export async function getBillableConcepts(): Promise<BillableConcept[]> {
  return queryWithFallback(
    async () => {
      return await supabase.from("billable_concepts").select("*");
    },
    () => {
      return readMockData().billable_concepts as BillableConcept[];
    }
  );
}

export async function searchPortalShipment(search: string): Promise<{ shipment: Shipment; logs: Log[] } | null> {
  return queryWithFallback(
    async () => {
      // Try finding by Reference or ID (number)
      let query = supabase.from("shipments").select(`*, status:statuses(*)`).limit(1);
      
      const isNum = !isNaN(Number(search));
      if (isNum) {
        query = query.or(`id.eq.${search},reference.ilike.%${search}%`);
      } else {
        query = query.ilike("reference", `%${search}%`);
      }
      
      const { data: shipments, error: sError } = await query;
      if (sError || !shipments || shipments.length === 0) return null;
      
      const shipment = shipments[0] as Shipment;
      
      // Fetch EXTERNAL logs only
      const { data: logs, error: lError } = await supabase.from("logs")
        .select("*")
        .eq("shipment_id", shipment.id)
        .eq("is_external", true)
        .order("created_at", { ascending: false });
        
      if (lError) console.error(lError);
      
      return {
        shipment: shipment as Shipment,
        logs: (logs || []) as Log[]
      };
    },
    () => {
      const data = readMockData();
      const isNum = !isNaN(Number(search));
      
      let s = null;
      if (isNum) {
        s = data.shipments.find((sh: any) => sh.id === Number(search));
      }
      if (!s) {
        s = data.shipments.find((sh: any) => sh.reference && sh.reference.toLowerCase() === search.toLowerCase());
      }
      if (!s) {
        s = data.shipments.find((sh: any) => sh.reference && sh.reference.toLowerCase().includes(search.toLowerCase()));
      }
      
      if (!s) return null;
      
      const status = data.statuses.find((st: any) => st.id === s.status_id);
      const logs = data.logs
        .filter((l: any) => l.shipment_id === s.id && l.is_external === true)
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
      return {
        shipment: { ...s, status } as Shipment,
        logs: logs as Log[]
      };
    }
  );
}

export async function getCustomers(): Promise<string[]> {
  const data = readMockData();
  return (data.customers || []) as string[];
}

export async function addCustomer(name: string): Promise<void> {
  const data = readMockData();
  if (!data.customers) data.customers = [];
  const trimmed = name.trim();
  if (trimmed && !data.customers.includes(trimmed)) {
    data.customers.push(trimmed);
    data.customers.sort();
    writeMockData(data);
  }
}

export async function addStatus(name: string, color_code: string, sort_order: number): Promise<void> {
  const data = readMockData();
  if (!data.statuses) data.statuses = [];
  const newId = data.statuses.length > 0 ? Math.max(...data.statuses.map((s: any) => s.id)) + 1 : 1;
  data.statuses.push({
    id: newId,
    name: name.trim(),
    color_code,
    sort_order
  });
  data.statuses.sort((a: any, b: any) => a.sort_order - b.sort_order);
  writeMockData(data);
}

export async function getAppConfig(): Promise<{ next_shipment_id: number }> {
  const data = readMockData();
  if (!data.config) {
    const maxId = data.shipments.length > 0 ? Math.max(...data.shipments.map((s: any) => s.id)) + 1 : 1;
    data.config = { next_shipment_id: maxId };
    writeMockData(data);
  }
  return data.config;
}

export async function updateAppConfig(config: { next_shipment_id: number }): Promise<void> {
  const data = readMockData();
  data.config = {
    ...data.config,
    next_shipment_id: Number(config.next_shipment_id)
  };
  writeMockData(data);
}

export async function clearDatabase(): Promise<void> {
  return queryWithFallback(
    async () => {
      // Clear logs first to avoid foreign key cascading failures
      await supabase.from("logs").delete().neq("id", "0");
      // Clear all shipments
      await supabase.from("shipments").delete().gt("id", 0);
      
      const data = readMockData();
      data.shipments = [];
      data.logs = [];
      data.customers = [];
      data.config = { next_shipment_id: 1001 };
      data.statuses = [
        { id: 1, name: "Quoting", color_code: "#94a3b8", sort_order: 1 },
        { id: 2, name: "Quoted", color_code: "#38bdf8", sort_order: 2 },
        { id: 3, name: "Coordinating", color_code: "#fbbf24", sort_order: 3 },
        { id: 4, name: "On the Way", color_code: "#818cf8", sort_order: 4 },
        { id: 5, name: "STAGE 2 - Completed", color_code: "#4ade80", sort_order: 5 },
        { id: 6, name: "Arrived", color_code: "#2dd4bf", sort_order: 6 },
        { id: 7, name: "Delivered", color_code: "#22c55e", sort_order: 7 },
        { id: 8, name: "Cancelled", color_code: "#f87171", sort_order: 8 }
      ];
      writeMockData(data);
    },
    () => {
      const data = readMockData();
      data.shipments = [];
      data.logs = [];
      data.customers = [];
      data.config = { next_shipment_id: 1001 };
      data.statuses = [
        { id: 1, name: "Quoting", color_code: "#94a3b8", sort_order: 1 },
        { id: 2, name: "Quoted", color_code: "#38bdf8", sort_order: 2 },
        { id: 3, name: "Coordinating", color_code: "#fbbf24", sort_order: 3 },
        { id: 4, name: "On the Way", color_code: "#818cf8", sort_order: 4 },
        { id: 5, name: "STAGE 2 - Completed", color_code: "#4ade80", sort_order: 5 },
        { id: 6, name: "Arrived", color_code: "#2dd4bf", sort_order: 6 },
        { id: 7, name: "Delivered", color_code: "#22c55e", sort_order: 7 },
        { id: 8, name: "Cancelled", color_code: "#f87171", sort_order: 8 }
      ];
      writeMockData(data);
    }
  );
}


