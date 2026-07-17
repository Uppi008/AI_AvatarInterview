/* eslint-disable react-refresh/only-export-components -- test utility file, not part of the app's HMR boundary */
import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import authReducer from "@/features/auth/authSlice";
import uiReducer from "@/features/ui/uiSlice";

const rootReducer = combineReducers({ auth: authReducer, ui: uiReducer });
type TestRootState = ReturnType<typeof rootReducer>;

export function makeTestStore(preloadedState?: Partial<TestRootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
  });
}

interface WrapperOptions {
  route?: string;
  preloadedState?: Partial<TestRootState>;
}

function AllProviders({
  children,
  route = "/",
  preloadedState,
}: {
  children: ReactNode;
} & WrapperOptions) {
  const store = makeTestStore(preloadedState);
  return (
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </Provider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  { route, preloadedState, ...renderOptions }: WrapperOptions & Omit<RenderOptions, "wrapper"> = {}
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders route={route} preloadedState={preloadedState}>
        {children}
      </AllProviders>
    ),
    ...renderOptions,
  });
}

export * from "@testing-library/react";
