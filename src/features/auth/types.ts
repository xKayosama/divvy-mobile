export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};
export type LoginRequest = { email: string; password: string };
export type RegisterRequest = LoginRequest & {
  firstName: string;
  lastName: string;
};
export type LoginResponse = {
  success: true;
  data: { token: string; user: User };
};
export type MeResponse = { success: true; data: { user: User } };
