import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { getApiErrorMessage } from "@/services/apiClient";
import { tokenStorage } from "@/services/apiClient";

import { authApi } from "./authApi";
import type { LoginPayload, RegisterPayload, User } from "./types";

export interface AuthState {
  user: User | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  status: "idle",
  error: null,
};

export const login = createAsyncThunk<User, LoginPayload, { rejectValue: string }>(
  "auth/login",
  async (payload, { rejectWithValue }) => {
    try {
      await authApi.wakeUp();
      const { data } = await authApi.login(payload);
      tokenStorage.set(data.access, data.refresh);
      return data.user;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, "Invalid email or password."));
    }
  }
);

export const register = createAsyncThunk<User, RegisterPayload, { rejectValue: string }>(
  "auth/register",
  async (payload, { rejectWithValue }) => {
    try {
      // The free-tier backend may be asleep; wait for it before registering.
      await authApi.wakeUp();
      await authApi.register(payload);
      // The backend doesn't gate login on is_email_verified, and the
      // verification email can silently never arrive (e.g. Render's free
      // plan blocks outbound SMTP) -- so log the new account in immediately
      // with the same credentials instead of stranding the user on a
      // "check your email" dead end.
      const { data } = await authApi.login({ email: payload.email, password: payload.password });
      tokenStorage.set(data.access, data.refresh);
      return data.user;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, "Registration failed."));
    }
  }
);

export const fetchCurrentUser = createAsyncThunk<User, void, { rejectValue: string }>(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await authApi.getMe();
      return data.user;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, "Session expired."));
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      tokenStorage.clear();
      state.user = null;
      state.status = "idle";
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Login failed.";
      })
      .addCase(register.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
      })
      .addCase(register.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Registration failed.";
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = "succeeded";
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null;
      });
  },
});

export const { logout, setUser } = authSlice.actions;
export default authSlice.reducer;
