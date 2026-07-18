export type Status = {
  id: number;
  name: string;
  color_code: string;
  sort_order: number;
};

export type Carrier = {
  id: number;
  code: string;
  name: string;
  handling_agent?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  firms_code?: string | null;
  import_fee?: string | number | null;
  payment_method?: string | null;
  storage?: string | null;
  notes?: string | null;
};

export type Subtask = {
  id: string;
  title: string;
  completed: boolean;
};

export type TaskLog = {
  timestamp: string;
  author: string;
  message: string;
};

export type Task = {
  id: number;
  title: string;
  description: string | null;
  assignee: string | null;
  start_date: string | null;
  deadline: string | null;
  status: 'Pending' | 'In Progress' | 'Completed';
  subtasks: Subtask[];
  logs?: TaskLog[];
  shipment_id?: number | null;
  shipment_reference?: string | null;
  created_at: string;
};

export type RateConcept = {
  id: string;
  category?: string;
  name: string;
  rate: string;
  notes: string;
};

export type Ratesheet = {
  id: number;
  name: string;
  client_name: string | null;
  markup_percent: number;
  rates: RateConcept[];
  created_at: string;
  updated_at: string;
};

export type BillableConcept = {
  id: number;
  name: string;
  description: string;
};

export type Log = {
  id: string;
  shipment_id: number;
  event_text: string;
  is_external: boolean;
  amount: number | null;
  amount_type?: 'cost' | 'selling' | null;
  billable_concept_id: number | null;
  created_at: string;
  // Included relations
  billable_concept?: BillableConcept;
  status_id?: number | null;
  status?: Status;
};

export type Shipment = {
  id: number;
  parent_shipment_id: number | null;
  client_name: string;
  reference: string;
  status_id: number | null;
  shipment_type: string | null;
  transport_mode: string | null;
  eta: string | null;
  etd: string | null;
  ct_file: string | null;
  warehouse_receipt: string | null;
  expo_mawb: string | null;
  expo_hawb: string | null;
  pcs: number | null;
  kgs: number | null;
  chw: number | null;
  aes: string | null;
  created_at: string;
  updated_at?: string | null;
  // Included relations
  status?: Status;
  logs?: Log[];
  children?: Shipment[];
  is_flagged?: boolean;
};
