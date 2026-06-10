import { supabase } from "./supabase";
import { Shipment, Status, Log, BillableConcept, Carrier } from "./types";
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

let cachedSystemShipmentId: number | null = null;

async function getOrCreateSystemShipmentId(): Promise<number> {
  if (cachedSystemShipmentId !== null) {
    return cachedSystemShipmentId;
  }
  
  const isDefaultUrl = checkIsDefaultUrl();
  if (isDemo || isDefaultUrl) {
    return 999999;
  }
  
  try {
    const { data: existing, error: findError } = await supabase
      .from("shipments")
      .select("id")
      .eq("client_name", "SYSTEM_DATA_STORE")
      .maybeSingle();
      
    if (findError) throw findError;
    
    if (existing) {
      cachedSystemShipmentId = existing.id;
      return existing.id;
    }
    
    // Create new system shipment
    const { data: newShip, error: createError } = await supabase
      .from("shipments")
      .insert({
        client_name: "SYSTEM_DATA_STORE",
        reference: "System Configuration Store"
      })
      .select()
      .single();
      
    if (createError) throw createError;
    
    cachedSystemShipmentId = newShip.id;
    return newShip.id;
  } catch (err) {
    console.error("Error in getOrCreateSystemShipmentId:", err);
    return 999999;
  }
}

async function getSystemValue<T>(key: string, defaultValue: T): Promise<T> {
  const isDefaultUrl = checkIsDefaultUrl();
  if (isDemo || isDefaultUrl) {
    const data = readMockData();
    if (!data.system_store) data.system_store = {};
    if (data.system_store[key] !== undefined) {
      return data.system_store[key] as T;
    }
    if (key === "SYSTEM_CARRIERS") return (data.carriers || defaultValue) as unknown as T;
    if (key === "SYSTEM_CUSTOMERS") return (data.customers || defaultValue) as unknown as T;
    if (key === "SYSTEM_CONFIG") return (data.config || defaultValue) as unknown as T;
    if (key === "SYSTEM_STATUSES") return (data.custom_statuses || defaultValue) as unknown as T;
    if (key === "SYSTEM_SHIPMENT_STATUSES") return (data.shipment_statuses || defaultValue) as unknown as T;
    return defaultValue;
  }
  
  try {
    const systemShipmentId = await getOrCreateSystemShipmentId();
    const { data: logRow, error: logError } = await supabase
      .from("logs")
      .select("event_text")
      .eq("shipment_id", systemShipmentId)
      .eq("amount_type", key)
      .maybeSingle();
      
    if (logError) throw logError;
    if (logRow && logRow.event_text) {
      return JSON.parse(logRow.event_text) as T;
    }
  } catch (err) {
    console.error(`Error loading system key ${key} from logs:`, err);
  }
  
  // Fallback to memory/file
  const data = readMockData();
  if (!data.system_store) data.system_store = {};
  if (data.system_store[key] !== undefined) {
    return data.system_store[key] as T;
  }
  if (key === "SYSTEM_CARRIERS") return (data.carriers || defaultValue) as unknown as T;
  if (key === "SYSTEM_CUSTOMERS") return (data.customers || defaultValue) as unknown as T;
  if (key === "SYSTEM_CONFIG") return (data.config || defaultValue) as unknown as T;
  if (key === "SYSTEM_STATUSES") return (data.custom_statuses || defaultValue) as unknown as T;
  if (key === "SYSTEM_SHIPMENT_STATUSES") return (data.shipment_statuses || defaultValue) as unknown as T;
  return defaultValue;
}

async function setSystemValue<T>(key: string, value: T): Promise<void> {
  const isDefaultUrl = checkIsDefaultUrl();
  if (isDemo || isDefaultUrl) {
    isDemo = true;
    const data = readMockData();
    if (!data.system_store) data.system_store = {};
    data.system_store[key] = value;
    if (key === "SYSTEM_CARRIERS") data.carriers = value;
    if (key === "SYSTEM_CUSTOMERS") data.customers = value;
    if (key === "SYSTEM_CONFIG") data.config = value;
    if (key === "SYSTEM_STATUSES") data.custom_statuses = value;
    if (key === "SYSTEM_SHIPMENT_STATUSES") data.shipment_statuses = value;
    writeMockData(data);
    return;
  }
  
  try {
    const systemShipmentId = await getOrCreateSystemShipmentId();
    const updatedValue = JSON.stringify(value);
    
    const { data: existingLog, error: findLogError } = await supabase
      .from("logs")
      .select("id")
      .eq("shipment_id", systemShipmentId)
      .eq("amount_type", key)
      .maybeSingle();
      
    if (findLogError) throw findLogError;
    
    if (existingLog) {
      const { error: updateError } = await supabase
        .from("logs")
        .update({ event_text: updatedValue })
        .eq("id", existingLog.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from("logs")
        .insert({
          shipment_id: systemShipmentId,
          amount_type: key,
          event_text: updatedValue,
          is_external: false
        });
      if (insertError) throw insertError;
    }
  } catch (err: any) {
    console.error(`Error saving system key ${key} to logs:`, err);
    const errMsg = err?.message || String(err);
    if (errMsg.includes("fetch") || errMsg.includes("ENOTFOUND") || errMsg.includes("getaddrinfo")) {
      isDemo = true;
    }
    const data = readMockData();
    if (!data.system_store) data.system_store = {};
    data.system_store[key] = value;
    if (key === "SYSTEM_CARRIERS") data.carriers = value;
    if (key === "SYSTEM_CUSTOMERS") data.customers = value;
    if (key === "SYSTEM_CONFIG") data.config = value;
    if (key === "SYSTEM_STATUSES") data.custom_statuses = value;
    if (key === "SYSTEM_SHIPMENT_STATUSES") data.shipment_statuses = value;
    writeMockData(data);
  }
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
    { id: 8, name: "Cancelled", color_code: "#f87171", sort_order: 8 },
    { id: 9, name: "Closed", color_code: "#64748b", sort_order: 9 }
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
      transport_mode: "Air",
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
      transport_mode: "Air",
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
      transport_mode: "Ocean",
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
      transport_mode: "Land",
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

// In-memory cache for mock database updates on read-only filesystems
let memoryMockData: any = null;

// Helper: Ensure the mock file exists and read it
function readMockData() {
  if (memoryMockData) {
    return memoryMockData;
  }
  if (!fs.existsSync(MOCK_DB_PATH)) {
    try {
      fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(initialMockData, null, 2), "utf8");
    } catch (e) {
      // ignore write error on read-only environments
    }
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
      try {
        fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(parsed, null, 2), "utf8");
      } catch (e) {
        // ignore write error
      }
    }
    memoryMockData = parsed;
    return parsed;
  } catch (e) {
    const fallback = {
      ...initialMockData,
      customers: ["Global Logistics Inc.", "Global Traders Corp", "InterContinental S.A."],
      config: { next_shipment_id: 1001 }
    };
    memoryMockData = fallback;
    return fallback;
  }
}

// Helper: Write data to the mock file
function writeMockData(data: any) {
  memoryMockData = data;
  try {
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    // ignore write error
  }
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
  const baseShipments = await queryWithFallback<Shipment[]>(
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

  const filtered = baseShipments.filter(s => s.client_name !== "SYSTEM_DATA_STORE");

  const shipmentStatuses = await getSystemValue<Record<number, number>>("SYSTEM_SHIPMENT_STATUSES", {});
  const allStatuses = await getStatuses();

  return filtered.map(s => {
    const customStatusId = shipmentStatuses[s.id];
    if (customStatusId !== undefined) {
      const matched = allStatuses.find(st => st.id === customStatusId);
      if (matched) {
        return {
          ...s,
          status_id: customStatusId,
          status: matched
        };
      }
    }
    return s;
  });
}

export async function getShipmentById(id: number): Promise<Shipment | null> {
  const baseShipment = await queryWithFallback<Shipment | null>(
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

  if (!baseShipment || baseShipment.client_name === "SYSTEM_DATA_STORE") {
    return null;
  }

  // Post-process custom concepts and statuses for logs
  if (baseShipment.logs) {
    const customConcepts = await getSystemValue<BillableConcept[]>("SYSTEM_BILLABLE_CONCEPTS", []);
    const logConcepts = await getSystemValue<Record<string, number>>("SYSTEM_LOG_CONCEPTS", {});
    const logStatuses = await getSystemValue<Record<string, number>>("SYSTEM_LOG_STATUSES", {});
    const allStatuses = await getStatuses();

    baseShipment.logs = baseShipment.logs.map((log: any) => {
      let updatedLog = { ...log };

      const customConceptId = logConcepts[log.id];
      if (customConceptId !== undefined) {
        const concept = customConcepts.find(c => c.id === customConceptId);
        if (concept) {
          updatedLog.billable_concept_id = customConceptId;
          updatedLog.billable_concept = concept;
        }
      }

      const logStatusId = logStatuses[log.id] || log.status_id;
      if (logStatusId !== undefined && logStatusId !== null) {
        const status = allStatuses.find(st => st.id === logStatusId);
        if (status) {
          updatedLog.status_id = logStatusId;
          updatedLog.status = status;
        }
      }

      return updatedLog;
    });
  }

  const shipmentStatuses = await getSystemValue<Record<number, number>>("SYSTEM_SHIPMENT_STATUSES", {});
  const customStatusId = shipmentStatuses[id];
  if (customStatusId !== undefined) {
    const allStatuses = await getStatuses();
    const matched = allStatuses.find(st => st.id === customStatusId);
    if (matched) {
      baseShipment.status_id = customStatusId;
      baseShipment.status = matched;
    }
  }

  if (baseShipment.children) {
    const allStatuses = await getStatuses();
    baseShipment.children = baseShipment.children.map(child => {
      const childCustomId = shipmentStatuses[child.id];
      if (childCustomId !== undefined) {
        const matched = allStatuses.find(st => st.id === childCustomId);
        if (matched) {
          return {
            ...child,
            status_id: childCustomId,
            status: matched
          };
        }
      }
      return child;
    });
  }

  return baseShipment;
}

export async function createShipment(
  client_name: string, 
  reference: string, 
  shipment_type: string,
  extra: {
    status_id?: number | null;
    transport_mode?: string | null;
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
  const initialStatusId = extra.status_id;
  const extraCopy = { ...extra };
  if (initialStatusId && initialStatusId >= 10000) {
    extraCopy.status_id = null;
  }

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
      status_id: extraCopy.status_id || (initialStatusId && initialStatusId >= 10000 ? null : 1),
      shipment_type,
      transport_mode: extraCopy.transport_mode || null,
      eta: extraCopy.eta || null,
      etd: extraCopy.etd || null,
      ct_file: extraCopy.ct_file || null,
      warehouse_receipt: extraCopy.warehouse_receipt || null,
      expo_mawb: extraCopy.expo_mawb || null,
      expo_hawb: extraCopy.expo_hawb || null,
      pcs: extraCopy.pcs || null,
      kgs: extraCopy.kgs || null,
      chw: extraCopy.chw || null,
      aes: extraCopy.aes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    data.shipments.push(newShipment);
    writeMockData(data);

    if (initialStatusId && initialStatusId >= 10000) {
      const shipmentStatuses = await getSystemValue<Record<number, number>>("SYSTEM_SHIPMENT_STATUSES", {});
      shipmentStatuses[newId] = initialStatusId;
      await setSystemValue("SYSTEM_SHIPMENT_STATUSES", shipmentStatuses);
      
      const allStatuses = await getStatuses();
      return {
        ...newShipment,
        status_id: initialStatusId,
        status: allStatuses.find(st => st.id === initialStatusId) || null
      } as unknown as Shipment;
    }

    return newShipment as Shipment;
  }
  try {
    const config = await getAppConfig();
    const targetId = config.next_shipment_id;

    const { data, error } = await supabase.from("shipments").insert({
      id: targetId,
      client_name,
      reference,
      shipment_type,
      transport_mode: extraCopy.transport_mode || null,
      status_id: extraCopy.status_id || (initialStatusId && initialStatusId >= 10000 ? null : 1),
      eta: extraCopy.eta || null,
      etd: extraCopy.etd || null,
      ct_file: extraCopy.ct_file || null,
      warehouse_receipt: extraCopy.warehouse_receipt || null,
      expo_mawb: extraCopy.expo_mawb || null,
      expo_hawb: extraCopy.expo_hawb || null,
      pcs: extraCopy.pcs || null,
      kgs: extraCopy.kgs || null,
      chw: extraCopy.chw || null,
      aes: extraCopy.aes || null,
    }).select().single();

    if (error) throw error;
    isDemo = false;
    
    try {
      await updateAppConfig({ next_shipment_id: targetId + 1 });
    } catch (e) {
      // Ignore config saving error
    }

    if (initialStatusId && initialStatusId >= 10000) {
      const shipmentStatuses = await getSystemValue<Record<number, number>>("SYSTEM_SHIPMENT_STATUSES", {});
      shipmentStatuses[targetId] = initialStatusId;
      await setSystemValue("SYSTEM_SHIPMENT_STATUSES", shipmentStatuses);
      
      const allStatuses = await getStatuses();
      return {
        ...data,
        status_id: initialStatusId,
        status: allStatuses.find(st => st.id === initialStatusId) || null
      } as Shipment;
    }

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
        status_id: extraCopy.status_id || (initialStatusId && initialStatusId >= 10000 ? null : 1),
        shipment_type,
        transport_mode: extraCopy.transport_mode || null,
        eta: extraCopy.eta || null,
        etd: extraCopy.etd || null,
        ct_file: extraCopy.ct_file || null,
        warehouse_receipt: extraCopy.warehouse_receipt || null,
        expo_mawb: extraCopy.expo_mawb || null,
        expo_hawb: extraCopy.expo_hawb || null,
        pcs: extraCopy.pcs || null,
        kgs: extraCopy.kgs || null,
        chw: extraCopy.chw || null,
        aes: extraCopy.aes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      data.shipments.push(newShipment);
      writeMockData(data);

      if (initialStatusId && initialStatusId >= 10000) {
        const shipmentStatuses = await getSystemValue<Record<number, number>>("SYSTEM_SHIPMENT_STATUSES", {});
        shipmentStatuses[newId] = initialStatusId;
        await setSystemValue("SYSTEM_SHIPMENT_STATUSES", shipmentStatuses);
        
        const allStatuses = await getStatuses();
        return {
          ...newShipment,
          status_id: initialStatusId,
          status: allStatuses.find(st => st.id === initialStatusId) || null
        } as unknown as Shipment;
      }

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
  amount_type?: 'cost' | 'selling' | null,
  status_id?: number | null
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
      status_id: req.status_id || null,
      created_at: new Date().toISOString()
    };

    data.logs.push(newLog);
    
    // Also update parent shipment's updated_at and status
    const shipment = data.shipments.find((s: any) => s.id === req.shipment_id);
    if (shipment) {
      if (req.status_id) {
        shipment.status_id = req.status_id;
      }
      shipment.updated_at = new Date().toISOString();
    }

    writeMockData(data);
    return;
  }
  try {
    const isCustomConcept = req.billable_concept_id && req.billable_concept_id >= 10000;
    const { status_id, ...logPayload } = req;
    const dbReq = isCustomConcept 
      ? { ...logPayload, billable_concept_id: null }
      : logPayload;

    const { data: insertedRows, error } = await supabase.from("logs").insert(dbReq).select();
    if (error) throw error;

    if (insertedRows && insertedRows.length > 0) {
      const insertedRow = insertedRows[0];
      if (isCustomConcept) {
        const logConcepts = await getSystemValue<Record<string, number>>("SYSTEM_LOG_CONCEPTS", {});
        logConcepts[insertedRow.id] = req.billable_concept_id!;
        await setSystemValue("SYSTEM_LOG_CONCEPTS", logConcepts);
      }
      if (status_id) {
        const logStatuses = await getSystemValue<Record<string, number>>("SYSTEM_LOG_STATUSES", {});
        logStatuses[insertedRow.id] = status_id;
        await setSystemValue("SYSTEM_LOG_STATUSES", logStatuses);
        // Sync main shipment status
        await updateShipmentStatus(req.shipment_id, status_id);
      }
    }
    
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
        status_id: req.status_id || null,
        created_at: new Date().toISOString()
      };

      data.logs.push(newLog);
      
      // Also update parent shipment's updated_at and status
      const shipment = data.shipments.find((s: any) => s.id === req.shipment_id);
      if (shipment) {
        if (req.status_id) {
          shipment.status_id = req.status_id;
        }
        shipment.updated_at = new Date().toISOString();
      }

      writeMockData(data);
      return;
    }
    throw err;
  }
}

export async function updateLog(id: string, fields: { event_text?: string; is_external?: boolean; amount?: number | null; amount_type?: 'cost' | 'selling' | null }): Promise<void> {
  const isDefaultUrl = checkIsDefaultUrl();
  if (isDemo || isDefaultUrl) {
    isDemo = true;
    const data = readMockData();
    const log = data.logs.find((l: any) => l.id === id);
    if (log) {
      if (fields.event_text !== undefined) log.event_text = fields.event_text;
      if (fields.is_external !== undefined) log.is_external = fields.is_external;
      if (fields.amount !== undefined) log.amount = fields.amount;
      if (fields.amount_type !== undefined) log.amount_type = fields.amount_type;
      writeMockData(data);
    }
    return;
  }
  try {
    const { error } = await supabase.from("logs").update(fields).eq("id", id);
    if (error) throw error;
    isDemo = false;
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.includes("fetch") || errMsg.includes("ENOTFOUND") || errMsg.includes("getaddrinfo")) {
      isDemo = true;
      const data = readMockData();
      const log = data.logs.find((l: any) => l.id === id);
      if (log) {
        if (fields.event_text !== undefined) log.event_text = fields.event_text;
        if (fields.is_external !== undefined) log.is_external = fields.is_external;
        if (fields.amount !== undefined) log.amount = fields.amount;
        if (fields.amount_type !== undefined) log.amount_type = fields.amount_type;
        writeMockData(data);
      }
      return;
    }
    throw err;
  }
}

export async function deleteLog(id: string): Promise<void> {
  const isDefaultUrl = checkIsDefaultUrl();
  if (isDemo || isDefaultUrl) {
    isDemo = true;
    const data = readMockData();
    data.logs = data.logs.filter((l: any) => l.id !== id);
    writeMockData(data);
    return;
  }
  try {
    const { error } = await supabase.from("logs").delete().eq("id", id);
    if (error) throw error;

    const logConcepts = await getSystemValue<Record<string, number>>("SYSTEM_LOG_CONCEPTS", {});
    if (logConcepts[id] !== undefined) {
      delete logConcepts[id];
      await setSystemValue("SYSTEM_LOG_CONCEPTS", logConcepts);
    }

    const logStatuses = await getSystemValue<Record<string, number>>("SYSTEM_LOG_STATUSES", {});
    if (logStatuses[id] !== undefined) {
      delete logStatuses[id];
      await setSystemValue("SYSTEM_LOG_STATUSES", logStatuses);
    }

    isDemo = false;
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.includes("fetch") || errMsg.includes("ENOTFOUND") || errMsg.includes("getaddrinfo")) {
      isDemo = true;
      const data = readMockData();
      data.logs = data.logs.filter((l: any) => l.id !== id);
      writeMockData(data);
      return;
    }
    throw err;
  }
}


export async function updateShipmentStatus(shipment_id: number, status_id: number): Promise<void> {
  const shipmentStatuses = await getSystemValue<Record<number, number>>("SYSTEM_SHIPMENT_STATUSES", {});
  
  if (status_id >= 10000) {
    shipmentStatuses[shipment_id] = status_id;
    await setSystemValue("SYSTEM_SHIPMENT_STATUSES", shipmentStatuses);
    
    const isDefaultUrl = checkIsDefaultUrl();
    if (!isDemo && !isDefaultUrl) {
      try {
        const { error } = await supabase.from("shipments").update({ status_id: null }).eq("id", shipment_id);
        if (error) throw error;
      } catch (err) {
        console.error("Error updating status_id to null in Supabase:", err);
      }
    }
  } else {
    if (shipmentStatuses[shipment_id] !== undefined) {
      delete shipmentStatuses[shipment_id];
      await setSystemValue("SYSTEM_SHIPMENT_STATUSES", shipmentStatuses);
    }
    
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

export async function deleteShipment(id: number): Promise<void> {
  const isDefaultUrl = checkIsDefaultUrl();
  if (isDemo || isDefaultUrl) {
    isDemo = true;
    const data = readMockData();
    const toDeleteIds = new Set<number>([id]);
    data.shipments.forEach((s: any) => {
      if (s.parent_shipment_id === id) {
        toDeleteIds.add(s.id);
      }
    });
    data.shipments = data.shipments.filter((s: any) => !toDeleteIds.has(s.id));
    data.logs = data.logs.filter((l: any) => !toDeleteIds.has(l.shipment_id));
    writeMockData(data);
    return;
  }
  try {
    const { error } = await supabase.from("shipments").delete().eq("id", id);
    if (error) throw error;
    isDemo = false;
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.includes("fetch") || errMsg.includes("ENOTFOUND") || errMsg.includes("getaddrinfo")) {
      isDemo = true;
      const data = readMockData();
      const toDeleteIds = new Set<number>([id]);
      data.shipments.forEach((s: any) => {
        if (s.parent_shipment_id === id) {
          toDeleteIds.add(s.id);
        }
      });
      data.shipments = data.shipments.filter((s: any) => !toDeleteIds.has(s.id));
      data.logs = data.logs.filter((l: any) => !toDeleteIds.has(l.shipment_id));
      writeMockData(data);
      return;
    }
    throw err;
  }
}

export async function getStatuses(): Promise<Status[]> {
  const baseStatuses = await queryWithFallback<Status[]>(
    async () => {
      return await supabase.from("statuses").select("*").order("sort_order", { ascending: true });
    },
    () => {
      return readMockData().statuses as Status[];
    }
  );

  const customStatuses = await getSystemValue<Status[]>("SYSTEM_STATUSES", []);
  
  const merged = [...baseStatuses];
  customStatuses.forEach(cs => {
    if (!merged.some(st => st.id === cs.id)) {
      merged.push(cs);
    }
  });

  const deletedStatuses = await getSystemValue<number[]>("SYSTEM_DELETED_STATUSES", []);
  const filtered = merged.filter(st => !deletedStatuses.includes(st.id));

  return filtered.sort((a, b) => a.sort_order - b.sort_order);
}

export async function getBillableConcepts(): Promise<BillableConcept[]> {
  const list = await queryWithFallback<BillableConcept[]>(
    async () => {
      return await supabase.from("billable_concepts").select("*");
    },
    () => {
      return readMockData().billable_concepts as BillableConcept[];
    }
  );
  const filtered = list.filter(c => !c.name.startsWith("SYSTEM_"));
  const customConcepts = await getSystemValue<BillableConcept[]>("SYSTEM_BILLABLE_CONCEPTS", []);
  return [...filtered, ...customConcepts];
}

export async function createBillableConcept(name: string, description?: string): Promise<BillableConcept> {
  const isDefaultUrl = checkIsDefaultUrl();
  if (isDemo || isDefaultUrl) {
    isDemo = true;
    const data = readMockData();
    if (!data.billable_concepts) data.billable_concepts = [];
    const newId = data.billable_concepts.length > 0 ? Math.max(...data.billable_concepts.map((c: any) => c.id)) + 1 : 1;
    const newConcept = {
      id: newId,
      name: name.trim(),
      description: description || ""
    };
    data.billable_concepts.push(newConcept);
    writeMockData(data);
    return newConcept as BillableConcept;
  }
  try {
    const customConcepts = await getSystemValue<BillableConcept[]>("SYSTEM_BILLABLE_CONCEPTS", []);
    const existing = customConcepts.find(c => c.name.toLowerCase().trim() === name.toLowerCase().trim());
    if (existing) {
      return existing;
    }
    const newId = customConcepts.length > 0 ? Math.max(...customConcepts.map(c => c.id)) + 1 : 10000;
    const newConcept: BillableConcept = {
      id: newId,
      name: name.trim(),
      description: description || ""
    };
    customConcepts.push(newConcept);
    await setSystemValue("SYSTEM_BILLABLE_CONCEPTS", customConcepts);
    return newConcept;
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.includes("fetch") || errMsg.includes("ENOTFOUND") || errMsg.includes("getaddrinfo")) {
      isDemo = true;
      const data = readMockData();
      if (!data.billable_concepts) data.billable_concepts = [];
      const newId = data.billable_concepts.length > 0 ? Math.max(...data.billable_concepts.map((c: any) => c.id)) + 1 : 1;
      const newConcept = {
        id: newId,
        name: name.trim(),
        description: description || ""
      };
      data.billable_concepts.push(newConcept);
      writeMockData(data);
      return newConcept as BillableConcept;
    }
    throw err;
  }
}

export async function searchPortalShipment(search: string): Promise<{ shipment: Shipment; logs: Log[] } | null> {
  const res = await queryWithFallback<{ shipment: Shipment; logs: Log[] } | null>(
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

  if (!res) return null;

  // Post-process custom statuses
  const shipmentStatuses = await getSystemValue<Record<number, number>>("SYSTEM_SHIPMENT_STATUSES", {});
  const customStatusId = shipmentStatuses[res.shipment.id];
  if (customStatusId !== undefined) {
    const allStatuses = await getStatuses();
    const matched = allStatuses.find(st => st.id === customStatusId);
    if (matched) {
      res.shipment.status_id = customStatusId;
      res.shipment.status = matched;
    }
  }

  // Post-process custom concepts and statuses for logs
  if (res.logs) {
    const customConcepts = await getSystemValue<BillableConcept[]>("SYSTEM_BILLABLE_CONCEPTS", []);
    const logConcepts = await getSystemValue<Record<string, number>>("SYSTEM_LOG_CONCEPTS", {});
    const logStatuses = await getSystemValue<Record<string, number>>("SYSTEM_LOG_STATUSES", {});
    const allStatuses = await getStatuses();

    res.logs = res.logs.map((log: any) => {
      let updatedLog = { ...log };

      const customConceptId = logConcepts[log.id];
      if (customConceptId !== undefined) {
        const concept = customConcepts.find(c => c.id === customConceptId);
        if (concept) {
          updatedLog.billable_concept_id = customConceptId;
          updatedLog.billable_concept = concept;
        }
      }

      const logStatusId = logStatuses[log.id] || log.status_id;
      if (logStatusId !== undefined && logStatusId !== null) {
        const status = allStatuses.find(st => st.id === logStatusId);
        if (status) {
          updatedLog.status_id = logStatusId;
          updatedLog.status = status;
        }
      }

      return updatedLog;
    });
  }

  return res;
}

export async function getCustomers(): Promise<string[]> {
  const defaults = ["Global Logistics Inc.", "Global Traders Corp", "InterContinental S.A."];
  const uniqueClients = new Set<string>(defaults);

  try {
    const isDefaultUrl = checkIsDefaultUrl();
    if (!isDemo && !isDefaultUrl) {
      const { data: shipmentsData, error: shipmentsError } = await supabase
        .from("shipments")
        .select("client_name");
      
      if (!shipmentsError && shipmentsData) {
        shipmentsData.forEach((s: any) => {
          if (s.client_name && s.client_name !== "SYSTEM_DATA_STORE") {
            uniqueClients.add(s.client_name.trim());
          }
        });
      }
    }
  } catch (err) {
    // ignore
  }

  const customCusts = await getSystemValue<string[]>("SYSTEM_CUSTOMERS", []);
  customCusts.forEach(c => uniqueClients.add(c));

  return Array.from(uniqueClients).sort();
}

export async function addCustomer(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;

  const customList = await getSystemValue<string[]>("SYSTEM_CUSTOMERS", []);
  if (!customList.includes(trimmed)) {
    customList.push(trimmed);
    await setSystemValue("SYSTEM_CUSTOMERS", customList);
  }
}

export async function addStatus(name: string, color_code: string, sort_order: number): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;

  const allStatuses = await getStatuses();
  const maxId = allStatuses.length > 0 ? Math.max(...allStatuses.map(s => s.id)) : 0;
  const newId = Math.max(10000, maxId + 1);

  const customStatuses = await getSystemValue<Status[]>("SYSTEM_STATUSES", []);
  if (!customStatuses.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) {
    customStatuses.push({
      id: newId,
      name: trimmed,
      color_code,
      sort_order
    });
    await setSystemValue("SYSTEM_STATUSES", customStatuses);
  }
}

export async function getAppConfig(): Promise<{ next_shipment_id: number }> {
  const defaultConfig = { next_shipment_id: 1001 };
  const systemConfig = await getSystemValue<{ next_shipment_id: number }>("SYSTEM_CONFIG", defaultConfig);

  let maxId = 0;
  const isDefaultUrl = checkIsDefaultUrl();
  if (!isDemo && !isDefaultUrl) {
    try {
      const { data, error } = await supabase
        .from("shipments")
        .select("id")
        .order("id", { ascending: false })
        .limit(1);
      if (!error && data && data.length > 0) {
        maxId = data[0].id;
      }
    } catch (e) {
      // ignore
    }
  } else {
    try {
      const data = readMockData();
      if (data.shipments && data.shipments.length > 0) {
        maxId = Math.max(...data.shipments.map((s: any) => s.id));
      }
    } catch (e) {
      // ignore
    }
  }

  let nextId = systemConfig.next_shipment_id || 1001;
  if (maxId > 0) {
    nextId = Math.max(nextId, maxId + 1);
  }
  return { next_shipment_id: nextId };
}

export async function deleteStatus(id: number): Promise<void> {
  if (id < 10000) {
    const deletedStatuses = await getSystemValue<number[]>("SYSTEM_DELETED_STATUSES", []);
    if (!deletedStatuses.includes(id)) {
      deletedStatuses.push(id);
      await setSystemValue("SYSTEM_DELETED_STATUSES", deletedStatuses);
    }
  } else {
    const customStatuses = await getSystemValue<Status[]>("SYSTEM_STATUSES", []);
    const updatedCustom = customStatuses.filter(s => s.id !== id);
    await setSystemValue("SYSTEM_STATUSES", updatedCustom);
  }

  // 2. Remove any mappings from SYSTEM_SHIPMENT_STATUSES
  const shipmentStatuses = await getSystemValue<Record<number, number>>("SYSTEM_SHIPMENT_STATUSES", {});
  let mappingChanged = false;
  for (const shipId in shipmentStatuses) {
    if (shipmentStatuses[shipId] === id) {
      delete shipmentStatuses[shipId];
      mappingChanged = true;
    }
  }
  if (mappingChanged) {
    await setSystemValue("SYSTEM_SHIPMENT_STATUSES", shipmentStatuses);
  }

  // 3. Clear standard status references on shipments
  const isDefaultUrl = checkIsDefaultUrl();
  if (!isDemo && !isDefaultUrl) {
    try {
      await supabase.from("shipments").update({ status_id: null }).eq("status_id", id);
    } catch (e) {
      // ignore
    }
  }
}

export async function updateAppConfig(config: { next_shipment_id: number }): Promise<void> {
  const systemConfig = { next_shipment_id: Number(config.next_shipment_id) };
  await setSystemValue("SYSTEM_CONFIG", systemConfig);
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
        { id: 8, name: "Cancelled", color_code: "#f87171", sort_order: 8 },
        { id: 9, name: "Closed", color_code: "#64748b", sort_order: 9 }
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
        { id: 8, name: "Cancelled", color_code: "#f87171", sort_order: 8 },
        { id: 9, name: "Closed", color_code: "#64748b", sort_order: 9 }
      ];
      writeMockData(data);
    }
  );
}

export async function seedDemoData(): Promise<void> {
  const isDefaultUrl = checkIsDefaultUrl();
  if (isDemo || isDefaultUrl) {
    isDemo = true;
    writeMockData(initialMockData);
    return;
  }
  
  try {
    // Check if we have statuses
    const { data: statuses, error: stError } = await supabase.from("statuses").select("id");
    if (stError) throw stError;
    
    if (!statuses || statuses.length === 0) {
      await supabase.from("statuses").insert([
        { id: 1, name: "Quoting", color_code: "#94a3b8", sort_order: 1 },
        { id: 2, name: "Quoted", color_code: "#38bdf8", sort_order: 2 },
        { id: 3, name: "Coordinating", color_code: "#fbbf24", sort_order: 3 },
        { id: 4, name: "On the Way", color_code: "#818cf8", sort_order: 4 },
        { id: 5, name: "STAGE 2 - Completed", color_code: "#4ade80", sort_order: 5 },
        { id: 6, name: "Arrived", color_code: "#2dd4bf", sort_order: 6 },
        { id: 7, name: "Delivered", color_code: "#22c55e", sort_order: 7 },
        { id: 8, name: "Cancelled", color_code: "#f87171", sort_order: 8 },
        { id: 9, name: "Closed", color_code: "#64748b", sort_order: 9 }
      ]);
    }

    // Check if we have billable concepts
    const { data: concepts, error: bcError } = await supabase.from("billable_concepts").select("id");
    if (bcError) throw bcError;
    if (!concepts || concepts.length === 0) {
      await supabase.from("billable_concepts").insert([
        { id: 1, name: "Air Freight", description: "Standard air carriage charges" },
        { id: 2, name: "Ocean Freight", description: "Ocean container carriage charges" },
        { id: 3, name: "In & Out", description: "Warehouse handling in & out" },
        { id: 4, name: "Storage", description: "Daily warehouse storage rate" },
        { id: 5, name: "Customs Clearance", description: "Import custom broker filing fee" }
      ]);
    }

    // Clear existing shipments/logs just in case
    await supabase.from("logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("shipments").delete().gt("id", 0);

    // Insert parent shipments
    const { data: parents, error: parentError } = await supabase.from("shipments").insert([
      {
        client_name: "Global Logistics Inc.",
        reference: "PO-99281-AMZ",
        status_id: 6,
        shipment_type: "Import",
        transport_mode: "Air",
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
      },
      {
        client_name: "Global Traders Corp",
        reference: "PO-8827-GT",
        status_id: 3,
        shipment_type: "Export",
        transport_mode: "Ocean",
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
      },
      {
        client_name: "InterContinental S.A.",
        reference: "PO-1102-IC",
        status_id: 8,
        shipment_type: "Transit",
        transport_mode: "Land",
        eta: "2026-05-25",
        etd: "2026-05-10",
        ct_file: "CT-11029",
        pcs: 5,
        kgs: 95,
        chw: 100,
      }
    ]).select();

    if (parentError || !parents) throw parentError || new Error("Failed to insert parents");

    const ship1 = parents.find(p => p.reference === "PO-99281-AMZ");
    const ship3 = parents.find(p => p.reference === "PO-8827-GT");

    if (ship1) {
      const { data: child, error: childError } = await supabase.from("shipments").insert({
        parent_shipment_id: ship1.id,
        client_name: "Global Logistics Inc.",
        reference: "PO-99281-AMZ - SPLIT A",
        status_id: 7,
        shipment_type: "Import",
        transport_mode: "Air",
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
      }).select().single();

      if (childError || !child) throw childError || new Error("Failed to insert child");

      const seedLogs = [
        {
          shipment_id: ship1.id,
          event_text: "File created in follow-up middleware. Waiting for documentation from supplier.",
          is_external: false,
          amount: null,
          billable_concept_id: null,
        },
        {
          shipment_id: ship1.id,
          event_text: "Documentation received. Coordinating flight schedules with Atlas Air.",
          is_external: true,
          amount: null,
          billable_concept_id: null,
        },
        {
          shipment_id: ship1.id,
          event_text: "Cargo arrived at airport warehouse and inspected. In & Out fees captured.",
          is_external: false,
          amount: 150.00,
          billable_concept_id: 3,
        },
        {
          shipment_id: child.id,
          event_text: "Cargo split from master shipment #1. Dispatched for final delivery to warehouse.",
          is_external: true,
          amount: null,
          billable_concept_id: null,
        },
        {
          shipment_id: child.id,
          event_text: "Cargo successfully delivered and signed by consignee.",
          is_external: true,
          amount: null,
          billable_concept_id: null,
        }
      ];

      if (ship3) {
        seedLogs.push({
          shipment_id: ship3.id,
          event_text: "Shipment details uploaded. Booking slot confirmed with airline carrier.",
          is_external: true,
          amount: null,
          billable_concept_id: null,
        });
      }

      const { error: logsError } = await supabase.from("logs").insert(seedLogs);
      if (logsError) throw logsError;
    }
  } catch (err) {
    console.error("Failed to seed database:", err);
    throw err;
  }
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
): Promise<Shipment> {
  const fieldsCopy = { ...fields };
  
  if (fieldsCopy.status_id !== undefined) {
    const status_id = fieldsCopy.status_id;
    const shipmentStatuses = await getSystemValue<Record<number, number>>("SYSTEM_SHIPMENT_STATUSES", {});
    
    if (status_id !== null && status_id >= 10000) {
      shipmentStatuses[id] = status_id;
      await setSystemValue("SYSTEM_SHIPMENT_STATUSES", shipmentStatuses);
      (fieldsCopy as any).status_id = null;
    } else {
      if (shipmentStatuses[id] !== undefined) {
        delete shipmentStatuses[id];
        await setSystemValue("SYSTEM_SHIPMENT_STATUSES", shipmentStatuses);
      }
    }
  }

  const isDefaultUrl = checkIsDefaultUrl();
  if (isDemo || isDefaultUrl) {
    isDemo = true;
    const data = readMockData();
    const index = data.shipments.findIndex((s: any) => s.id === id);
    if (index === -1) throw new Error("Shipment not found");
    const updated = {
      ...data.shipments[index],
      ...fieldsCopy,
      updated_at: new Date().toISOString()
    };
    data.shipments[index] = updated;
    writeMockData(data);
    return updated as Shipment;
  }
  try {
    const { data, error } = await supabase
      .from("shipments")
      .update({
        ...fieldsCopy,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    isDemo = false;
    return data as Shipment;
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.includes("fetch") || errMsg.includes("ENOTFOUND") || errMsg.includes("getaddrinfo")) {
      isDemo = true;
      const data = readMockData();
      const index = data.shipments.findIndex((s: any) => s.id === id);
      if (index === -1) throw new Error("Shipment not found");
      const updated = {
        ...data.shipments[index],
        ...fieldsCopy,
        updated_at: new Date().toISOString()
      };
      data.shipments[index] = updated;
      writeMockData(data);
      return updated as Shipment;
    }
    throw err;
  }
}

export async function getCarriers(): Promise<Carrier[]> {
  const defaults = [
    { id: 1, code: "001", name: "American Airlines" },
    { id: 2, code: "023", name: "FedEx" },
    { id: 3, code: "MAEU", name: "Maersk" }
  ];
  return await getSystemValue<Carrier[]>("SYSTEM_CARRIERS", defaults);
}

export async function addCarrier(code: string, name: string): Promise<void> {
  const trimmedCode = code.trim().toUpperCase();
  const trimmedName = name.trim();
  if (!trimmedCode || !trimmedName) return;

  const carrierList = await getCarriers();
  if (!carrierList.some(c => c.code === trimmedCode)) {
    const newId = carrierList.length > 0 ? Math.max(...carrierList.map((c: any) => c.id)) + 1 : 1;
    carrierList.push({ id: newId, code: trimmedCode, name: trimmedName });
    carrierList.sort((a, b) => a.code.localeCompare(b.code));
    await setSystemValue("SYSTEM_CARRIERS", carrierList);
  }
}

export async function deleteCarrier(id: number): Promise<void> {
  const carrierList = await getCarriers();
  const updatedList = carrierList.filter((c: any) => c.id !== id);
  await setSystemValue("SYSTEM_CARRIERS", updatedList);
}



