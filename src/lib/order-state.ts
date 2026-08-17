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
  email: string;
  notes: string;
};

export type OrderStep = 'idle' | 'configurator' | 'customer_data' | 'summary' | 'review' | 'success';

interface OrderState {
  items: OrderItem[];
  customer: CustomerData;
  editingItemId: string | null;
  currentStep: OrderStep;
  setStep: (step: OrderStep) => void;
  addItem: (item: Omit<OrderItem, 'local_id'>) => void;
  removeItem: (local_id: string) => void;
  updateItem: (local_id: string, item: Omit<OrderItem, 'local_id'>) => void;
  setCustomer: (data: CustomerData) => void;
  setEditingItemId: (id: string | null) => void;
  clearOrder: () => void;
  resetOrder: () => void;
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useOrderState = create<OrderState>()(
  persist(
    (set) => ({
      items: [],
      customer: { name: '', whatsapp: '', email: '', notes: '' },
      editingItemId: null,
      currentStep: 'idle',
      setStep: (step) => set({ currentStep: step }),
      addItem: (item) => set((state) => ({ 
        items: [...state.items, { ...item, local_id: crypto.randomUUID() }] 
      })),
      removeItem: (local_id) => set((state) => ({ 
        items: state.items.filter(i => i.local_id !== local_id) 
      })),
      updateItem: (local_id, item) => set((state) => ({
        items: state.items.map(i => i.local_id === local_id ? { ...item, local_id } : i)
      })),
      setCustomer: (customer) => set({ customer }),
      setEditingItemId: (editingItemId) => set({ editingItemId }),
      clearOrder: () => set({ items: [], customer: { name: '', whatsapp: '', email: '', notes: '' }, editingItemId: null }),
      resetOrder: () => set({ currentStep: 'idle', items: [], customer: { name: '', whatsapp: '', email: '', notes: '' }, editingItemId: null }),
    }),
    {
      name: 'av-order-storage',
    }
  )
);
