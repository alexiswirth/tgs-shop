export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      shops: {
        Row: {
          id: string
          name: string
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          created_at?: string
        }
      }
      items: {
        Row: {
          id: string
          shop_id: string
          name: string
          description: string
          buying_price: number
          selling_price: number
          quantity: number
          tax: number
          category: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          name: string
          description?: string
          buying_price: number
          selling_price: number
          quantity?: number
          tax?: number
          category?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          name?: string
          description?: string
          buying_price?: number
          selling_price?: number
          quantity?: number
          tax?: number
          category?: string
          created_at?: string
          updated_at?: string
        }
      }
      discounts: {
        Row: {
          id: string
          shop_id: string
          name: string
          discount_type: 'percentage' | 'fixed'
          discount_value: number
          is_active: boolean
          applies_to: 'all' | 'item' | 'category'
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          name: string
          discount_type: 'percentage' | 'fixed'
          discount_value: number
          is_active?: boolean
          applies_to?: 'all' | 'item' | 'category'
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          name?: string
          discount_type?: 'percentage' | 'fixed'
          discount_value?: number
          is_active?: boolean
          applies_to?: 'all' | 'item' | 'category'
          created_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          shop_id: string
          total_amount: number
          discount_id: string | null
          discount_amount: number
          final_amount: number
          sale_date: string
          payment_method: string | null
          cash_given: number | null
          change_amount: number | null
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          total_amount: number
          discount_id?: string | null
          discount_amount?: number
          final_amount: number
          sale_date?: string
          payment_method?: string | null
          cash_given?: number | null
          change_amount?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          total_amount?: number
          discount_id?: string | null
          discount_amount?: number
          final_amount?: number
          sale_date?: string
          payment_method?: string | null
          cash_given?: number | null
          change_amount?: number | null
          created_at?: string
        }
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          item_id: string
          item_name: string
          quantity: number
          unit_price: number
          subtotal: number
          tax_amount: number
          buying_price: number
        }
        Insert: {
          id?: string
          sale_id: string
          item_id: string
          item_name: string
          quantity: number
          unit_price: number
          subtotal: number
          tax_amount?: number
          buying_price: number
        }
        Update: {
          id?: string
          sale_id?: string
          item_id?: string
          item_name?: string
          quantity?: number
          unit_price?: number
          subtotal?: number
          tax_amount?: number
          buying_price?: number
        }
      }
      discount_items: {
        Row: {
          id: string
          discount_id: string
          item_id: string
          created_at: string
        }
        Insert: {
          id?: string
          discount_id: string
          item_id: string
          created_at?: string
        }
        Update: {
          id?: string
          discount_id?: string
          item_id?: string
          created_at?: string
        }
      }
      discount_categories: {
        Row: {
          id: string
          discount_id: string
          category: string
          created_at: string
        }
        Insert: {
          id?: string
          discount_id: string
          category: string
          created_at?: string
        }
        Update: {
          id?: string
          discount_id?: string
          category?: string
          created_at?: string
        }
      }
    }
  }
}
