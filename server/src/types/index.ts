export type Role = 'user' | 'admin';

export interface User {
  email: string;
  name: string;
  role: Role;
  status: 'Active' | 'Inactive';
}

export interface Vendor {
  vendorId: string;
  vendorName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  status: 'Active' | 'Inactive';
}

export interface Item {
  itemId: string;
  itemName: string;
  category: string;
  description: string;
  unitOfMeasurement: string;
  currency: 'PKR';
}

export type POStatus = 'Draft' | 'Pending' | 'Approved' | 'Ordered' | 'Received' | 'Cancelled';

export interface PurchaseOrder {
  poId: string;
  vendorId: string;
  orderDate: string;
  status: POStatus;
  totalAmount: number;
}

export interface PurchaseOrderLine {
  lineId: string;
  poId: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Quotation {
  quotationId: string;
  vendorId: string;
  itemId: string;
  quotedPrice: number;
  quotationDate: string;
  validityDate: string;
}

export interface HistoricalPurchase {
  purchaseId: string;
  vendorId: string;
  itemId: string;
  purchaseDate: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

export interface AiAnswer {
  text: string;
  table?: {
    head: string[];
    rows: (string | number)[][];
  };
  chart?: {
    type: 'bar' | 'line';
    data: { name: string; value: number }[];
  };
  sources: string[];
  followups: string[];
}

export interface Dataset {
  id: string;
  name: string;
  type: string;
  date: string;
  by: string;
  records: number;
  status: string;
  rows: Record<string, unknown>[];
}

export interface Issue {
  row: number;
  level: 'Error' | 'Warning';
  msg: string;
}
