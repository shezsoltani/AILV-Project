export interface RegisterFormValues {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterValidationErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}
