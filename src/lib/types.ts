export type PaymentStatus = 'pending' | 'under_review' | 'completed' | 'failed' | 'cancelled';
export type PaymentMethodType = 'card' | 'paypal' | 'crypto';
export type PaymentMode = 'demo' | 'live';

export interface ClientRecord {
  id: number;
  full_name: string;
  email: string;
  reference_number: string;
  photo_url: string | null;
  case_category: string;
  case_details: string;
  amount_cents: number;
  payment_status: PaymentStatus;
  payment_instructions: string;
  admin_notes: string;
  is_active: number; // 1 or 0
  can_client_edit_photo: number; // 1 or 0
  created_at: string;
  updated_at: string;
}

export interface AdministratorRecord {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  role: string;
  must_change_password: number; // 1 or 0
  created_at: string;
  updated_at: string;
}

export interface PaymentRecord {
  id: number;
  client_id: number;
  reference_number: string;
  method: PaymentMethodType;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  mode: PaymentMode;
  provider_ref?: string | null;
  failure_reason?: string | null;
  crypto_currency?: string | null;
  crypto_network?: string | null;
  crypto_tx_hash?: string | null;
  client_ip?: string | null;
  created_at: string;
  updated_at: string;
  client_name?: string;
  client_email?: string;
}

export interface AuditLogRecord {
  id: number;
  actor_type: 'admin' | 'client' | 'system';
  actor_id: number | null;
  actor_email: string;
  action: string;
  details: string; // JSON string
  ip_address: string;
  created_at: string;
}

export interface UploadedAsset {
  id: string;
  filename: string;
  mime_type: string;
  data_base64: string;
  asset_type: 'logo' | 'client_photo' | 'favicon' | 'doc';
  size_bytes: number;
  created_at: string;
}

export interface AgencyBrandingSettings {
  agency_name: string;
  tagline: string;
  logo_url: string | null;
  favicon_url: string | null;
  support_email: string;
  support_phone: string;
  support_hours: string;
  office_address: string;
  jurisdiction_notice: string;
  copyright_text: string;
}

export interface ThemeSettings {
  primary_color: string;
  primary_hover: string;
  secondary_sky: string;
  secondary_sky_light: string;
  text_navy: string;
  card_radius: string; // e.g. '0.75rem'
  button_radius: string; // e.g. '0.5rem'
}

export interface LoadingScreenSettings {
  default_title: string;
  default_description: string;
  transition_duration_ms: number; // e.g. 1500
  show_progress_steps: boolean;
  spinner_style: 'fintech-pulse' | 'circular-ring' | 'card-shimmer';
  enable_step_transitions: boolean;
}

export interface HomepageSettings {
  hero_badge: string;
  hero_headline: string;
  hero_description: string;
  hero_button_text: string;
  hero_secondary_info: string;
  welcome_title: string;
  welcome_text: string;
  visa_info_title: string;
  visa_info_text: string;
  instructions_title: string;
  instructions_steps: { step: number; title: string; desc: string }[];
  faqs: { question: string; answer: string }[];
  show_welcome_section: boolean;
  show_visa_info_section: boolean;
  show_instructions_section: boolean;
  show_methods_section: boolean;
  show_faq_section: boolean;
  show_support_section: boolean;
}

export interface PaymentMethodSettings {
  card_enabled: boolean;
  card_order: number;
  card_mode: PaymentMode;
  card_demo_failure_message: string;
  card_instructions: string;
  card_allow_retry: boolean;
  card_provider_name: string;
  card_publishable_key: string;

  paypal_enabled: boolean;
  paypal_order: number;
  paypal_unavailability_message: string;
  paypal_instructions: string;
  paypal_client_id: string;

  crypto_enabled: boolean;
  crypto_order: number;
  crypto_instructions: string;
  crypto_required_confirmations: number;
  crypto_support_contact: string;
  crypto_currencies: {
    symbol: string;
    name: string;
    network: string;
    wallet_address: string;
    enabled: boolean;
  }[];
}

export interface LegalContentSettings {
  terms_of_service: string;
  privacy_policy: string;
  payment_and_refund_policy: string;
  fee_disclosure: string;
}

export interface SecuritySettings {
  admin_session_timeout_mins: number;
  client_session_timeout_mins: number;
  max_login_attempts: number;
  lockout_minutes: number;
  force_admin_password_change: boolean;
}
