import { create } from "zustand";
import {
  getProjectRange,
  getProjectInvocations,
  getSupportedCoreContracts,
  getProjectOnChainStatus,
} from "@/utils/project";
import { networkCoreDeployments } from "@/utils/env";
import { usePublicClientStore } from "./publicClientStore";
import { CoreDeployment } from "@/deployments/cores";
import { Hex } from "viem";

// Helper functions for URL manipulation
const getInitialStateFromURL = () => {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);
  return {
    contractAddress: params.get("contractAddress") || undefined,
    projectId: params.get("projectId")
      ? Number(params.get("projectId"))
      : undefined,
    tokenInvocation: params.get("tokenInvocation")
      ? Number(params.get("tokenInvocation"))
      : undefined,
  };
};

const updateURLParams = (params: Record<string, string | undefined>) => {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  });
  window.history.pushState({}, "", url);
};

interface TokenState {
  // State
  contractAddress: string | undefined;
  projectId: number | undefined;
  tokenInvocation: number | undefined;
  projectRange: [number, number] | null;
  invocations: number | null;
  isLoading: {
    projectRange: boolean;
    invocations: boolean;
    onChainStatus: boolean;
  };
  supportedContractDeployments: CoreDeployment[];
  onChainStatus: {
    dependencyFullyOnChain: boolean;
    injectsDecentralizedStorageNetworkAssets: boolean;
    hasOffChainFlexDepRegDependencies: boolean;
  } | null;

  // Autoplay state
  isPlaying: boolean;
  autoplayInterval: number; // in seconds
  autoplayMode: "sequential" | "random";

  // Actions
  setContractAddress: (address: string) => Promise<void>;
  setProjectId: (id: number) => Promise<void>;
  setTokenInvocation: (invocation: number) => void;
  initialize: () => Promise<void>;

  // Autoplay actions
  setIsPlaying: (isPlaying: boolean) => void;
  setAutoplayInterval: (seconds: number) => void;
  setAutoplayMode: (mode: "sequential" | "random") => void;
}

export const useTokenFormStore = create<TokenState>((set, get) => ({
  // Initial state merged with URL params
  ...{
    contractAddress: undefined,
    projectId: undefined,
    tokenInvocation: undefined,
    projectRange: null,
    invocations: null,
    isLoading: {
      projectRange: false,
      invocations: false,
      onChainStatus: false,
    },
    supportedContractDeployments: networkCoreDeployments,
    onChainStatus: null,

    // Initial autoplay state
    isPlaying: false,
    autoplayInterval: 30, // default 30 seconds
    autoplayMode: "sequential" as const,
  },
  ...getInitialStateFromURL(),
  supportedContractDeployments: networkCoreDeployments,

  // Actions
  setContractAddress: async (address: string) => {
    const { publicClient } = usePublicClientStore.getState();
    set({ contractAddress: address });
    updateURLParams({ contractAddress: address });

    // Reset and load new project range
    set({
      projectRange: null,
      projectId: undefined,
      onChainStatus: null,
      isLoading: { ...get().isLoading, projectRange: true },
    });
    updateURLParams({ projectId: undefined, tokenInvocation: undefined });

    const coreDeployment = get().supportedContractDeployments.find(
      (d) => d.address.toLowerCase() === address.toLowerCase()
    );

    if (coreDeployment) {
      const range = await getProjectRange(publicClient, coreDeployment);
      const invocations = await getProjectInvocations(
        publicClient,
        coreDeployment,
        range[0]
      );

      const onChainStatus = await getProjectOnChainStatus(
        publicClient,
        coreDeployment,
        range[0]
      );

      set({
        projectRange: range,
        projectId: range[0], // Auto-select first project,
        invocations: Number(invocations),
        tokenInvocation: 0,
        isLoading: { ...get().isLoading, projectRange: false },
        onChainStatus: onChainStatus,
      });
      updateURLParams({ projectId: range[0].toString() });
    }
  },

  setProjectId: async (id: number) => {
    const { publicClient } = usePublicClientStore.getState();
    set({ projectId: id });
    updateURLParams({ projectId: id.toString() });

    // Reset and load new invocations
    set({
      invocations: null,
      tokenInvocation: undefined,
      onChainStatus: null,
      isLoading: { ...get().isLoading, invocations: true },
    });
    updateURLParams({ tokenInvocation: undefined });

    const { contractAddress } = get();
    const coreDeployment = get().supportedContractDeployments.find(
      (d) => d.address.toLowerCase() === contractAddress?.toLowerCase()
    );

    if (coreDeployment) {
      const invocations = await getProjectInvocations(
        publicClient,
        coreDeployment,
        id
      );
      const onChainStatus = await getProjectOnChainStatus(
        publicClient,
        coreDeployment,
        id
      );
      set({
        invocations: Number(invocations),
        tokenInvocation: 0, // Auto-select first token
        isLoading: { ...get().isLoading, invocations: false },
        onChainStatus: onChainStatus,
      });
      updateURLParams({ tokenInvocation: "0" });
    }
  },

  setTokenInvocation: (invocation: number) => {
    set({ tokenInvocation: invocation });
    updateURLParams({ tokenInvocation: invocation.toString() });
  },

  initialize: async () => {
    const { publicClient } = usePublicClientStore.getState();
    const { contractAddress } = get();

    // Get dynamically discovered contracts
    const fetchedContractAddresses = await getSupportedCoreContracts(
      publicClient
    );

    // Create a deduped list of all supported contract addresses combining
    // hardcoded and dynamically discovered ones
    const allContractAddresses: Hex[] = [
      // Create full list with hardcoded contracts first, then dynamic ones
      // Filter out duplicates using Set
      ...new Set([
        ...networkCoreDeployments.map((d) => d.address),
        ...fetchedContractAddresses,
      ]),
    ];

    // Format the list into CoreDeployment objects
    const supportedContractDeployments: CoreDeployment[] =
      allContractAddresses.map((address) => {
        const hardcodedDeployment = networkCoreDeployments.find(
          (d) => d.address === address
        );
        return hardcodedDeployment ?? { address };
      });

    // Update the store with the new supported contract deployments
    set({ supportedContractDeployments });

    // If we have a contract address from URL, load its data
    if (contractAddress) {
      const coreDeployment = supportedContractDeployments.find(
        (d) => d.address.toLowerCase() === contractAddress.toLowerCase()
      );

      // If the contract address is not supported, act as though no
      // search params were provided
      if (!coreDeployment) {
        await get().setContractAddress(networkCoreDeployments[0].address);
        return;
      }

      // Load the project range for the contract
      set({ isLoading: { ...get().isLoading, projectRange: true } });
      const range = await getProjectRange(publicClient, coreDeployment);
      set({
        projectRange: range,
        isLoading: { ...get().isLoading, projectRange: false },
      });

      // If we have a project ID from URL, load its invocations
      const { projectId } = get();
      if (projectId !== undefined) {
        set({ isLoading: { ...get().isLoading, invocations: true } });
        const invocations = await getProjectInvocations(
          publicClient,
          coreDeployment,
          projectId
        );
        const onChainStatus = await getProjectOnChainStatus(
          publicClient,
          coreDeployment,
          projectId
        );
        set({
          invocations: Number(invocations),
          isLoading: { ...get().isLoading, invocations: false },
          tokenInvocation: get().tokenInvocation ?? 0,
          onChainStatus: onChainStatus,
        });
      }
    } else {
      // If no contract address, set default
      await get().setContractAddress(networkCoreDeployments[0].address);
    }
  },

  // Autoplay actions
  setIsPlaying: (isPlaying) => {
    set({ isPlaying });
  },

  setAutoplayInterval: (seconds) => {
    // Clamp between 10 and 86400 (24 hours)
    const clampedSeconds = Math.max(10, Math.min(86400, seconds));
    set({ autoplayInterval: clampedSeconds });
  },

  setAutoplayMode: (mode) => {
    set({ autoplayMode: mode });
  },
}));
