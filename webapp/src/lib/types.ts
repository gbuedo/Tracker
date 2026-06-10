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
  // Included relations
  status?: Status;
  logs?: Log[];
  children?: Shipment[];
};
