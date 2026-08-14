import { useState, useEffect } from "react";

export type OrderItem = {
  local_id: string;
  shirt_model_id: string;
  model_code: string;
  model_name: string;
  category: 'tshirt' | 'tank';
  size_option: string;
  custom_size: string | null;
  custom_name: string | null;
  custom_number: string | null;
  quantity: number;
};

export type CustomerData = {
  name: string;
  whatsapp: string;
  notes: string;
};

export const useOrderState = () => {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [customer, setCustomer] = useState<CustomerData>({ name: '', whatsapp: '', notes: '' });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const addItem = (item: Omit<OrderItem, 'local_id'>) => {
    setItems(prev => [...prev, { ...item, local_id: crypto.randomUUID() }]);
  };

  const removeItem = (local_id: string) => {
    setItems(prev => prev.filter(i => i.local_id !== local_id));
  };

  const updateItem = (local_id: string, item: Omit<OrderItem, 'local_id'>) => {
    setItems(prev => prev.map(i => i.local_id === local_id ? { ...item, local_id } : i));
  };

  const clearOrder = () => {
    setItems([]);
    setCustomer({ name: '', whatsapp: '', notes: '' });
    setEditingItemId(null);
  };

  return {
    items,
    setItems,
    customer,
    setCustomer,
    editingItemId,
    setEditingItemId,
    addItem,
    removeItem,
    updateItem,
    clearOrder
  };
};
