"use client";

import { useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDeviceTokenHash } from "@/lib/device-identity";
import type { ParticipantProfile } from "@/lib/types";

type ProfileState =
  | { status: "loading" }
  | { status: "none" }
  | { status: "found"; profile: ParticipantProfile }
  | { status: "creating" }
  | { status: "error"; message: string };

function normalizeProfile(data: unknown): ParticipantProfile | null {
  if (!data) return null;
  if (Array.isArray(data)) {
    return (data[0] as ParticipantProfile) ?? null;
  }
  if (typeof data === "object" && data !== null && "id" in data) {
    return data as ParticipantProfile;
  }
  return null;
}

function createProfileStore(eventId: string) {
  let state: ProfileState = { status: "loading" };
  const listeners = new Set<() => void>();
  let loaded = false;

  const setState = (next: ProfileState) => {
    state = next;
    listeners.forEach((l) => l());
  };

  const load = async () => {
    setState({ status: "loading" });
    try {
      const tokenHash = await getDeviceTokenHash(eventId);
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_device_profile", {
        p_event_id: eventId,
        p_token_hash: tokenHash,
      });
      if (error) throw error;
      const profile = normalizeProfile(data);
      if (profile) {
        setState({ status: "found", profile });
      } else {
        setState({ status: "none" });
      }
    } catch (e) {
      setState({
        status: "error",
        message: e instanceof Error ? e.message : "Erro ao carregar perfil",
      });
    }
  };

  const createProfile = async (name: string, referencePhotoUrl: string) => {
    setState({ status: "creating" });
    try {
      const tokenHash = await getDeviceTokenHash(eventId);
      const supabase = createClient();
      const { data, error } = await supabase.rpc("create_participant_profile", {
        p_event_id: eventId,
        p_token_hash: tokenHash,
        p_name: name,
        p_reference_photo_url: referencePhotoUrl,
      });
      if (error) throw error;
      const profile = normalizeProfile(data);
      if (!profile) throw new Error("Perfil não criado");
      setState({ status: "found", profile });
      return profile;
    } catch (e) {
      setState({
        status: "error",
        message: e instanceof Error ? e.message : "Erro ao criar perfil",
      });
      throw e;
    }
  };

  const subscribe = (cb: () => void) => {
    listeners.add(cb);
    if (!loaded) {
      loaded = true;
      void load();
    }
    return () => listeners.delete(cb);
  };

  const getSnapshot = () => state;

  return { subscribe, getSnapshot, createProfile, refresh: load };
}

const storeCache = new Map<string, ReturnType<typeof createProfileStore>>();

function getStore(eventId: string) {
  if (!storeCache.has(eventId)) {
    storeCache.set(eventId, createProfileStore(eventId));
  }
  return storeCache.get(eventId)!;
}

export function useEventProfile(eventId: string) {
  const store = getStore(eventId);
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );

  return {
    state,
    createProfile: store.createProfile,
    refresh: store.refresh,
    profile: state.status === "found" ? state.profile : null,
  };
}
