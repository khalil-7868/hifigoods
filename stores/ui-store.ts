"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Vehicle, Route } from "@/lib/database.types";

/**
 * Client-only UI state.
 *
 * Deliberately two stores:
 *
 *  · `useUIStore` is ephemeral — dialogs, the mobile drawer, the command
 *    palette. Not persisted, so it initialises identically on server and client
 *    and cannot cause a hydration mismatch.
 *  · `useChromeStore` persists the shell's layout preferences. Persisted values
 *    read during the first render *would* mismatch the server HTML, so consumers
 *    check `hydrated` and render the default until rehydration finishes.
 */

interface UIState {
  // Vehicles
  isAddVehicleOpen: boolean;
  vehicleToDelete: Vehicle | null;
  openAddVehicle: () => void;
  closeAddVehicle: () => void;
  requestDeleteVehicle: (vehicle: Vehicle) => void;
  clearDeleteVehicle: () => void;

  // Routes
  isAddRouteOpen: boolean;
  routeToEdit: Route | null;
  openAddRoute: () => void;
  closeAddRoute: () => void;
  setRouteToEdit: (route: Route | null) => void;

  // Mobile nav drawer
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Command palette
  isCommandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  toggleCommand: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isAddVehicleOpen: false,
  vehicleToDelete: null,
  openAddVehicle: () => set({ isAddVehicleOpen: true }),
  closeAddVehicle: () => set({ isAddVehicleOpen: false }),
  requestDeleteVehicle: (vehicle) => set({ vehicleToDelete: vehicle }),
  clearDeleteVehicle: () => set({ vehicleToDelete: null }),

  isAddRouteOpen: false,
  routeToEdit: null,
  openAddRoute: () => set({ isAddRouteOpen: true }),
  closeAddRoute: () => set({ isAddRouteOpen: false }),
  setRouteToEdit: (route) => set({ routeToEdit: route }),

  isSidebarOpen: false,
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),

  isCommandOpen: false,
  setCommandOpen: (open) => set({ isCommandOpen: open }),
  toggleCommand: () => set((s) => ({ isCommandOpen: !s.isCommandOpen })),
}));

/* -------------------------------------------------------------------------- */
/* Persisted shell preferences                                                 */
/* -------------------------------------------------------------------------- */

interface ChromeState {
  /** False until zustand has rehydrated from localStorage. */
  hydrated: boolean;
  /** Icon-only desktop rail. */
  railCollapsed: boolean;
  toggleRail: () => void;
  /**
   * Sidebar group labels the user has explicitly collapsed.
   *
   * Stored as the *collapsed* set rather than the open set so a newly added
   * group defaults to open, with no migration needed.
   */
  collapsedGroups: string[];
  toggleGroup: (label: string) => void;
}

export const useChromeStore = create<ChromeState>()(
  persist(
    (set) => ({
      hydrated: false,

      railCollapsed: false,
      toggleRail: () => set((s) => ({ railCollapsed: !s.railCollapsed })),

      collapsedGroups: [],
      toggleGroup: (label) =>
        set((s) => ({
          collapsedGroups: s.collapsedGroups.includes(label)
            ? s.collapsedGroups.filter((l) => l !== label)
            : [...s.collapsedGroups, label],
        })),
    }),
    {
      name: "hifigoods-chrome",
      storage: createJSONStorage(() => localStorage),
      // `hydrated` is runtime-only and must never be written to storage.
      partialize: (s) => ({
        railCollapsed: s.railCollapsed,
        collapsedGroups: s.collapsedGroups,
      }),
      onRehydrateStorage: () => () => {
        useChromeStore.setState({ hydrated: true });
      },
    },
  ),
);
