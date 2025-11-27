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
      // Add tables here
    }
    Views: {
      // Add views here
    }
    Functions: {
      // Add functions here
    }
    Enums: {
      // Add enums here
    }
  }
}
