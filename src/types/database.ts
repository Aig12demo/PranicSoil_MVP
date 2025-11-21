export type UserRole = 'gardener' | 'farmer' | 'rancher' | 'admin';

export interface Profile {
  id: string;
  user_id?: string;
  email: string;
  role: UserRole;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  notifications_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GardenerProfile {
  id: string;
  profile_id: string;
  property_size?: string;
  garden_type?: string;
  growing_zone?: string;
  current_challenges?: string;
  soil_type?: string;
  sunlight_exposure?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FarmerProfile {
  id: string;
  profile_id: string;
  farm_size?: string;
  crop_types?: string[];
  certifications?: string[];
  equipment?: string;
  current_challenges?: string;
  farming_practices?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RancherProfile {
  id: string;
  profile_id: string;
  ranch_size?: string;
  livestock_types?: string[];
  herd_size?: string;
  grazing_management?: string;
  water_resources?: string;
  current_challenges?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceAgreement {
  id: string;
  profile_id: string;
  agreement_type: string;
  status: 'active' | 'pending' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  total_amount?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Invoice {
  id: string;
  service_agreement_id?: string;
  profile_id: string;
  invoice_number: string;
  amount: number;
  description?: string;
  due_date?: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_date?: string;
  created_at?: string;
}

export interface SharedTodo {
  id: string;
  profile_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  due_date?: string;
  created_by: string;
  assigned_to?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
}

export interface TodoComment {
  id: string;
  todo_id: string;
  profile_id: string;
  comment: string;
  created_at?: string;
}

export interface ChatMessage {
  id: string;
  profile_id?: string;
  session_id: string;
  message_type: 'user' | 'assistant';
  message_content: string;
  context_type: 'public' | 'authenticated';
  created_at?: string;
}

export interface Document {
  id: string;
  profile_id: string;
  file_name: string;
  file_type?: string;
  file_url: string;
  description?: string;
  uploaded_at?: string;
}

export interface VoiceConversation {
  id: string;
  profile_id?: string;
  session_id: string;
  context_type: 'public' | 'authenticated';
  duration_seconds: number;
  started_at: string;
  ended_at?: string;
  user_role?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface SoilTestReport {
  id: string;
  profile_id: string;
  farm_id?: string | null;
  client_name?: string | null;
  client_location?: string | null;
  grower_name?: string | null;
  grower_location?: string | null;
  report_date?: string | null;
  date_received?: string | null;
  field_id?: string | null;
  sample_id?: string | null;
  ph_soil?: number | null;
  ph_buffer?: number | null;
  phosphorus_op?: number | null;
  phosphorus_m3?: number | null;
  potassium?: number | null;
  calcium?: number | null;
  magnesium?: number | null;
  sulfur?: number | null;
  boron?: number | null;
  copper?: number | null;
  iron?: number | null;
  manganese?: number | null;
  zinc?: number | null;
  sodium?: number | null;
  soluble_salts?: number | null;
  organic_matter?: number | null;
  estimated_n_release?: number | null;
  nitrate_nitrogen?: number | null;
  cec?: number | null;
  sat_k_percent?: number | null;
  sat_k_meq?: number | null;
  sat_ca_percent?: number | null;
  sat_ca_meq?: number | null;
  sat_mg_percent?: number | null;
  sat_mg_meq?: number | null;
  sat_h_percent?: number | null;
  sat_h_meq?: number | null;
  sat_na_percent?: number | null;
  sat_na_meq?: number | null;
  k_mg_ratio?: number | null;
  ca_mg_ratio?: number | null;
  report_image_url?: string | null;
  extraction_status?: 'pending' | 'processing' | 'completed' | 'failed';
  extraction_raw_json?: Record<string, any> | null;
  extraction_notes?: string | null;
  created_at?: string;
  updated_at?: string;
}