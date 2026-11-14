export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      account_transactions: {
        Row: {
          amount: number
          created_at: string
          customer_account_id: string
          description: string | null
          id: string
          order_id: string | null
          payment_method: string | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_account_id: string
          description?: string | null
          id?: string
          order_id?: string | null
          payment_method?: string | null
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_account_id?: string
          description?: string | null
          id?: string
          order_id?: string | null
          payment_method?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_transactions_customer_account_id_fkey"
            columns: ["customer_account_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_bootstrap: {
        Row: {
          claimed_at: string | null
          claimed_user_id: string | null
          email: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_user_id?: string | null
          email: string
        }
        Update: {
          claimed_at?: string | null
          claimed_user_id?: string | null
          email?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          id: string
          name: string
          slug: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          sort: number
        }
        Insert: {
          id?: string
          name: string
          slug: string
          sort?: number
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          sort?: number
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          subject?: string
        }
        Relationships: []
      }
      customer_accounts: {
        Row: {
          address: string | null
          company_name: string
          created_at: string
          discount_rate: number
          id: string
          notes: string | null
          phone: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          company_name: string
          created_at?: string
          discount_rate?: number
          id?: string
          notes?: string | null
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string
          created_at?: string
          discount_rate?: number
          id?: string
          notes?: string | null
          phone?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_accounts_profile_fk"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          created_at: string
          created_by: string
          filename: string
          id: string
          rolled_back_at: string | null
          rolled_back_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          filename: string
          id?: string
          rolled_back_at?: string | null
          rolled_back_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          filename?: string
          id?: string
          rolled_back_at?: string | null
          rolled_back_by?: string | null
        }
        Relationships: []
      }
      import_items: {
        Row: {
          applied_data: Json
          applied_revision: number
          batch_id: string
          id: string
          previous_data: Json
          product_id: string
          was_created: boolean
        }
        Insert: {
          applied_data: Json
          applied_revision: number
          batch_id: string
          id?: string
          previous_data: Json
          product_id: string
          was_created?: boolean
        }
        Update: {
          applied_data?: Json
          applied_revision?: number
          batch_id?: string
          id?: string
          previous_data?: Json
          product_id?: string
          was_created?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "import_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_requests: {
        Row: {
          created_at: string
          order_id: string
          payload: Json
          request_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          order_id: string
          payload: Json
          request_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          order_id?: string
          payload?: Json
          request_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_account_id: string | null
          discount_rate: number
          id: string
          notes: string | null
          order_no: number
          status: string
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_account_id?: string | null
          discount_rate?: number
          id?: string
          notes?: string | null
          order_no?: number
          status?: string
          total?: number
          user_id: string
        }
        Update: {
          created_at?: string
          customer_account_id?: string | null
          discount_rate?: number
          id?: string
          notes?: string | null
          order_no?: number
          status?: string
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_account_id_fkey"
            columns: ["customer_account_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      product_oem_numbers: {
        Row: {
          id: string
          oem: string
          product_id: string
        }
        Insert: {
          id?: string
          oem: string
          product_id: string
        }
        Update: {
          id?: string
          oem?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_oem_numbers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_supplier_codes: {
        Row: {
          code: string | null
          id: string
          product_id: string
          supplier_id: string
        }
        Insert: {
          code?: string | null
          id?: string
          product_id: string
          supplier_id: string
        }
        Update: {
          code?: string | null
          id?: string
          product_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_supplier_codes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_supplier_codes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_vehicles: {
        Row: {
          brand_id: string
          id: string
          model_id: string | null
          product_id: string
        }
        Insert: {
          brand_id: string
          id?: string
          model_id?: string | null
          product_id: string
        }
        Update: {
          brand_id?: string
          id?: string
          model_id?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_vehicles_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_vehicles_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "vehicle_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_vehicles_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_original_url: string | null
          image_thumbnail_url: string | null
          image_url: string | null
          max_stock: number | null
          min_stock: number
          name: string
          needs_review: boolean
          package_quantity: number | null
          price: number
          revision: number
          sku: string | null
          slug: string
          stock: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_original_url?: string | null
          image_thumbnail_url?: string | null
          image_url?: string | null
          max_stock?: number | null
          min_stock?: number
          name: string
          needs_review?: boolean
          package_quantity?: number | null
          price?: number
          revision?: number
          sku?: string | null
          slug: string
          stock?: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_original_url?: string | null
          image_thumbnail_url?: string | null
          image_url?: string | null
          max_stock?: number | null
          min_stock?: number
          name?: string
          needs_review?: boolean
          package_quantity?: number | null
          price?: number
          revision?: number
          sku?: string | null
          slug?: string
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          created_at: string
          id: string
          product_id: string
          purchase_date: string
          quantity: number
          supplier_id: string | null
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          purchase_date?: string
          quantity: number
          supplier_id?: string | null
          unit_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          purchase_date?: string
          quantity?: number
          supplier_id?: string | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          new_stock: number
          previous_stock: number | null
          product_id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          new_stock: number
          previous_stock?: number | null
          product_id: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          new_stock?: number
          previous_stock?: number | null
          product_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_models: {
        Row: {
          brand_id: string
          id: string
          name: string
        }
        Insert: {
          brand_id: string
          id?: string
          name: string
        }
        Update: {
          brand_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      account_balances: {
        Row: {
          balance: number | null
          customer_account_id: string | null
          total_credit: number | null
          total_debit: number | null
        }
        Relationships: [
          {
            foreignKeyName: "account_transactions_customer_account_id_fkey"
            columns: ["customer_account_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sales: {
        Row: {
          product_id: string | null
          quantity: number | null
          revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_import: {
        Args: { _creates: Json; _filename: string; _updates: Json }
        Returns: string
      }
      catalog_norm: { Args: { _text: string }; Returns: string }
      catalog_page: {
        Args: {
          _brand?: string
          _category?: string
          _model?: string
          _page?: number
          _q?: string
          _slug?: string
        }
        Returns: Json
      }
      create_admin_product: {
        Args: {
          _initial_stock: number
          _oems: Json
          _product: Json
          _supplier_codes: Json
          _vehicles: Json
        }
        Returns: string
      }
      create_product_with_photos: {
        Args: {
          _initial_stock: number
          _oems: Json
          _product: Json
          _supplier_codes: Json
          _vehicles: Json
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      place_order: { Args: { _items: Json; _notes?: string }; Returns: string }
      place_order_once: {
        Args: { _items: Json; _notes: string; _request_key: string }
        Returns: string
      }
      replace_product_supplier_codes: {
        Args: { _codes: Json; _product_id: string }
        Returns: undefined
      }
      rollback_import: { Args: { _batch_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
