export interface User {
  user_id: number;
  username?: string;
  email: string;
  role_id?: number;
  status?: string;
  password_hash?: string;
  created_at?: string;
  updated_at?: string;
  account?: {
    account_id?: number;
    first_name: string;
    last_name: string;
    phone_number?: string;
    department?: string;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  role?: {
    role_id: number;
    name: string;
    description?: string;
    permissions?: any;
  };
}

export interface UserWithAccount extends User {
  account: {
    account_id: number;
    first_name: string;
    last_name: string;
    phone_number?: string;
    department?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
  };
}

export interface UserSelectOption {
  value: User;
  label: string;
} 