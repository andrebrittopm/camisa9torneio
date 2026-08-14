export interface AvCatalogEvent {
  id: string
  event_number: number
  event_year: number
  event_name: string
  location: string
  unit_price: number
  orders_available: boolean
  order_deadline: string | null
}

export interface AvShirtModel {
  id: string
  code: string
  name: string
  category: 'tshirt' | 'tank'
  image_url: string | null
  model_3d_url: string | null
  available_sizes: string[]
  allow_custom_size: boolean
  sort_order: number
}

export interface AvCatalogResponse {
  success: boolean
  data: {
    event: AvCatalogEvent
    models: AvShirtModel[]
  }
}

export async function fetchAvCatalog(): Promise<AvCatalogResponse> {
  const response = await fetch('/api/public/av-catalog')
  if (!response.ok) {
    throw new Error('FAILED_TO_FETCH_CATALOG')
  }
  return response.json()
}
