export type Role='user'|'admin';
export interface Vendor{vendorId:string;vendorName:string;contactPerson:string;email:string;phone:string;address:string;status:'Active'|'Inactive'}
export interface Item{itemId:string;itemName:string;category:string;description:string;unitOfMeasurement:string;currency:'PKR'}
export type POStatus='Draft'|'Pending'|'Approved'|'Ordered'|'Received'|'Cancelled';
export interface PurchaseOrder{poId:string;vendorId:string;orderDate:string;status:POStatus;totalAmount:number}
export interface PurchaseOrderLine{lineId:string;poId:string;itemId:string;quantity:number;unitPrice:number;lineTotal:number}
export interface Quotation{quotationId:string;vendorId:string;itemId:string;quotedPrice:number;quotationDate:string;validityDate:string}
export interface HistoricalPurchase{purchaseId:string;vendorId:string;itemId:string;purchaseDate:string;quantity:number;unitPrice:number;totalAmount:number}
export interface AssistantTable {
  title: string;
  head: string[];
  rows: (string | number)[][];
  details?: {
    matched: number;
    total: number;
    aggregate: boolean;
    metricLabels?: Record<string, string>;
    notes: string[];
    filters: { field: string; op: 'eq' | 'ne' | 'contains' | 'in' | 'gt' | 'gte' | 'lt' | 'lte'; value: string | number | (string | number)[] }[];
  };
}
export interface AiAnswer {
  tables?: AssistantTable[];
  mode?: 'ai' | 'local' | 'conversation';
  warnings?: string[];
  plan?: unknown;
  text: string;
  table?: Pick<AssistantTable, 'head' | 'rows'>;
  chart?: { type: 'bar' | 'line'; data: { name: string; value: number }[] };
  sources: string[];
  followups: string[];
}
