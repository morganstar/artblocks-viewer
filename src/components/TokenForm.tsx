import { useIdle } from "@/hooks/useIdle";
import { cn } from "@/lib/utils";
import { networkCoreDeployments } from "@/utils/env";
import {
  ArrowUpRight,
  Check,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsUpDown,
  EditIcon,
  PanelBottomOpen,
  PanelLeftClose,
  PanelLeftOpen,
  PlayIcon,
  PauseIcon,
  RotateCcwIcon,
  ShuffleIcon,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { ArtBlocksLockup } from "./ArtBlocksLockup";
import { GitHubIcon } from "./GitHubIcon";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./ui/drawer";
import { Input } from "./ui/input";
import { useTokenFormStore } from "../stores/tokenFormStore";
import { usePublicClientStore } from "@/stores/publicClientStore";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { Tooltip } from "@radix-ui/react-tooltip";
import { TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { EthereumIcon } from "./EthereumIcon";

export function TokenForm() {
  // Get and initialize the token form state
  const {
    contractAddress,
    projectId,
    tokenInvocation,
    projectRange,
    invocations,
    isLoading,
    // supportedContractDeployments,
    isPlaying,
    autoplayInterval,
    autoplayMode,
    setContractAddress,
    setProjectId,
    setTokenInvocation,
    initialize,
    setIsPlaying,
    setAutoplayInterval,
    setAutoplayMode,
  } = useTokenFormStore();
  // const { publicClient } = usePublicClientStore();

  // const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [drawerDirection, setDrawerDirection] = useState<"left" | "bottom">(
    "left"
  );
  // Drawer direction changes based on screen size, left for desktop, bottom for mobile
  useEffect(() => {
    const handleResize = () => {
      setDrawerDirection(window.innerWidth >= 640 ? "left" : "bottom");
    };

    // Set initial direction
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Hide the drawer trigger when the user is idle
  const isIdle = useIdle();

  // Autoplay effect
  useEffect(() => {
    if (!isPlaying || !invocations) return;

    const timer = setInterval(() => {
      if (autoplayMode === "sequential") {
        // Go to next token, or wrap around to 0
        const nextToken = (tokenInvocation ?? 0) + 1;
        setTokenInvocation(nextToken >= invocations ? 0 : nextToken);
      } else {
        // Random mode
        const randomToken = Math.floor(Math.random() * invocations);
        setTokenInvocation(randomToken);
      }
    }, autoplayInterval * 1000);

    return () => clearInterval(timer);
  }, [isPlaying, autoplayInterval, autoplayMode, tokenInvocation, invocations, setTokenInvocation]);

  return (
    <>
      <Drawer
        direction={drawerDirection}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      >
        <DrawerTrigger
          asChild
          autoFocus={false}
          className={cn(
            "absolute z-20 bottom-4 left-4 sm:bottom-auto sm:top-10 sm:left-10 p-4 bg-black bg-opacity-50 rounded-full transition-all duration-500 hover:bg-opacity-80",
            {
              "opacity-0": isIdle,
            }
          )}
        >
          <button>
            <PanelLeftOpen className="hidden w-5 h-5 stroke-1 stroke-white sm:block" />
            <PanelBottomOpen className="w-5 h-5 stroke-1 stroke-white sm:hidden" />
            <VisuallyHidden>Open Token Selection Form</VisuallyHidden>
          </button>
        </DrawerTrigger>
        <DrawerContent
          className="sm:rounded-lg sm:inset-auto sm:mt-auto sm:left-2 sm:top-2 sm:max-w-[400px]"
          style={
            { "--initial-transform": "calc(100% + 8px)" } as React.CSSProperties
          }
        >
          <div className="flex flex-col w-full mx-auto overflow-auto sm:h-full bg-background">
            <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted sm:hidden" />
            <DrawerHeader>
              <div className="flex justify-between">
                <DrawerTitle className="flex justify-center flex-1 sm:justify-start">
                  <ArtBlocksLockup
                    height={24}
                    className="fill-black w-[132px]"
                  />
                </DrawerTitle>
                <DrawerClose asChild className="hidden sm:block">
                  <button className="transition-opacity duration-300 opacity-50 hover:opacity-100">
                    <PanelLeftClose className="w-6 h-6 stroke-1 stroke-muted-foreground" />
                    <VisuallyHidden>Close Token Selection Form</VisuallyHidden>
                  </button>
                </DrawerClose>
              </div>
              <DrawerDescription>
                Choose a token to view it using data stored entirely on-chain.
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-col flex-1 gap-4 px-4 mb-6">
              <div>
                <label className="block w-full mb-2">Contract</label>
                <ContractSelect
                  value={contractAddress}
                  handleChange={setContractAddress}
                />
                <BoundNumericInput
                  label="Project"
                  value={projectId?.toString() ?? ""}
                  onValueChange={(value) => {
                    if (isNaN(Number(value))) {
                      return;
                    }
                    setProjectId(Number(value));
                  }}
                  onBlur={(value) => {
                    if (isNaN(Number(value)) || !projectRange) {
                      return;
                    }

                    const clampedId = Math.max(
                      Math.min(Number(value), projectRange[1]),
                      projectRange[0]
                    );

                    setProjectId(clampedId);
                  }}
                  min={projectRange?.[0]}
                  max={projectRange?.[1]}
                  loading={isLoading.projectRange}
                  showRandom
                />
                <div className="flex flex-col gap-2">
                  <BoundNumericInput
                    label="Token"
                    value={tokenInvocation?.toString() ?? ""}
                    notice={<OnChainDetails className="ml-1" />}
                    onValueChange={(value) => {
                      if (isNaN(Number(value))) {
                        return;
                      }
                      setTokenInvocation(Number(value));
                    }}
                    onBlur={(value) => {
                      if (isNaN(Number(value)) || !invocations) {
                        return;
                      }

                      const clampedId = Math.max(
                        Math.min(Number(value), invocations - 1),
                        0
                      );

                      setTokenInvocation(clampedId);
                    }}
                    min={0}
                    max={invocations ? invocations - 1 : 0}
                    loading={isLoading.invocations}
                    showRandom
                  />
                  <div>
                    <label className="block w-full mb-2">Auto Play</label>
                    <button
                        className={cn("flex items-center opacity-50 hover:opacity-100 transition-opacity", {
                          "opacity-100": autoplayMode === "random"
                        })}
                        onClick={() => setAutoplayMode(autoplayMode === "sequential" ? "random" : "sequential")}
                        title={`Switch to ${autoplayMode === "sequential" ? "random" : "sequential"} mode`}
                    >
                      <ShuffleIcon className="w-4 h-4 stroke-1" />
                    </button>
                    <button
                      className={cn("flex items-center opacity-50 hover:opacity-100 transition-opacity", {
                        "opacity-100": isPlaying
                      })}
                      onClick={() => setIsPlaying(!isPlaying)}
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? (
                        <PauseIcon className="w-4 h-4 stroke-1" />
                      ) : (
                        <PlayIcon className="w-4 h-4 stroke-1" />
                      )}
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <BoundNumericInput
                      label="Interval (seconds)"
                      value={autoplayInterval.toString()}
                      onValueChange={(value) => {
                        if (isNaN(Number(value))) {
                          return;
                        }
                        setAutoplayInterval(Number(value));
                      }}
                      onBlur={(value) => {
                        if (isNaN(Number(value))) {
                          return;
                        }
                        const seconds = Number(value);
                        setAutoplayInterval(Math.max(10, Math.min(86400, seconds)));
                      }}
                      min={10}
                      max={86400}
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* <JsonRpcUrlForm className="px-4" />
            <DrawerFooter>
              <div className="flex items-center justify-between gap-2">
                <a
                  href="https://github.com/ArtBlocks/on-chain-generator-viewer"
                  target="_blank"
                  className="opacity-50 hover:opacity-100"
                >
                  <GitHubIcon fill="black" className="w-6 h-6" />
                </a>
                <a
                  className="flex items-center gap-1 opacity-50 hover:opacity-100"
                  href="https://artblocks.io/onchain"
                  target="_blank"
                >
                  Learn more <ArrowUpRight className="w-4 h-4 stroke-1" />
                </a>
              </div>
            </DrawerFooter> */}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export function ContractSelect({
  value,
  handleChange,
  className,
}: {
  value?: string;
  handleChange: (address: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const supportedContracts = useTokenFormStore(
    (state) => state.supportedContractDeployments
  );

  const val = value ?? networkCoreDeployments[0].address;
  const label = supportedContracts.find((d) => d.address === val)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex gap-2 min-w-0">
          <button
            aria-expanded={open}
            className={cn(
              "flex text-body items-center justify-between w-full px-4 py-2 h-10 rounded-[2px] border border-border min-w-0",
              className
            )}
          >
            <span className="overflow-hidden text-ellipsis min-w-0">
              <span className="mr-2">{label ?? val}</span>
              {label ? (
                <span className="text-xs text-muted-foreground">
                  ({val.slice(0, 6)}…{val.slice(-4)})
                </span>
              ) : null}
            </span>
            <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50 stroke-1 shrink-0" />
          </button>
          <button
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-[2px] border border-border opacity-50 hover:opacity-100 transition-opacity",
              className
            )}
            onClick={(e) => {
              e.preventDefault();
              const randomContract = supportedContracts[Math.floor(Math.random() * supportedContracts.length)];
              handleChange(randomContract.address);
            }}
            title="Select random contract"
          >
            <ShuffleIcon className="w-4 h-4 stroke-1" />
          </button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] h-[var(--radix-popover-content-available-height)] sm:h-auto p-0">
        <Command>
          <CommandInput placeholder="Search contracts..." />
          <CommandList>
            <CommandEmpty>No contract found.</CommandEmpty>
            <CommandGroup>
              {supportedContracts.map((deployment) => (
                <CommandItem
                  key={deployment.address}
                  value={deployment.address}
                  onSelect={(currentValue) => {
                    handleChange(currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === deployment.address ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="overflow-hidden">
                    <span className="block overflow-hidden text-ellipsis">
                      {deployment.label ?? deployment.address}
                    </span>
                    {deployment.label ? (
                      <span className="text-xs text-muted-foreground">
                        ({deployment.address})
                      </span>
                    ) : null}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function OnChainDetails({ className }: { className?: string }) {
  const projectOnChainStatus = useTokenFormStore(
    (state) => state.projectOnChainStatus
  );

  if (!projectOnChainStatus) {
    return null;
  }

  const {
    dependencyFullyOnChain,
    injectsDecentralizedStorageNetworkAssets,
    hasOffChainFlexDepRegDependencies,
  } = projectOnChainStatus;

  const fullyOnChain =
    dependencyFullyOnChain &&
    !injectsDecentralizedStorageNetworkAssets &&
    !hasOffChainFlexDepRegDependencies;

  let message = "";
  if (fullyOnChain) {
    message = "All components of this artwork are stored fully on-chain.";
  } else {
    const issues: string[] = [];

    if (!dependencyFullyOnChain || hasOffChainFlexDepRegDependencies) {
      issues.push("relies on libraries that have not yet been stored on-chain");
    }

    if (injectsDecentralizedStorageNetworkAssets) {
      issues.push(
        "requires assets stored off-chain using decentralized storage"
      );
    }

    message = `This artwork ${issues.join(" and ")}.`;
  }

  return (
    <Tooltip>
      <TooltipTrigger>
        <EthereumIcon
          className={cn(
            "w-4 h-4",
            {
              "fill-green-500": fullyOnChain,
              "fill-yellow-500": !fullyOnChain,
            },
            className
          )}
        />
      </TooltipTrigger>
      <TooltipContent>{message}</TooltipContent>
    </Tooltip>
  );
}

export function JsonRpcUrlForm({ className }: { className?: string }) {
  const [editing, setEditing] = useState(false);
  const { jsonRpcUrl, setJsonRpcUrl, resetJsonRpcUrl } = usePublicClientStore();
  const [pendingJsonRpcUrl, setPendingJsonRpcUrl] = useState(jsonRpcUrl);
  const isDefaultJsonRpcUrl =
    jsonRpcUrl === import.meta.env.VITE_JSON_RPC_PROVIDER_URL;

  useEffect(() => {
    setPendingJsonRpcUrl(jsonRpcUrl);
  }, [jsonRpcUrl]);

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (editing) {
          setJsonRpcUrl(pendingJsonRpcUrl);
        }
        setEditing(!editing);
      }}
    >
      <label className="block mb-2 text-muted-foreground">
        Ethereum RPC Endpoint
      </label>
      <div className="flex items-center gap-4">
        <Input
          value={pendingJsonRpcUrl}
          onChange={(e) => setPendingJsonRpcUrl(e.target.value)}
          disabled={!editing}
        />
        <button type="submit">
          {editing ? (
            <>
              <CheckIcon className="w-4 h-4 stroke-1" />
              <VisuallyHidden>Set RPC Endpoint</VisuallyHidden>
            </>
          ) : (
            <>
              <EditIcon className="w-4 h-4 stroke-1" />
              <VisuallyHidden>Edit RPC Endpoint</VisuallyHidden>
            </>
          )}
        </button>
        {!editing && !isDefaultJsonRpcUrl ? (
          <button
            onClick={() => {
              resetJsonRpcUrl();
            }}
            type="button"
          >
            <RotateCcwIcon className="w-4 h-4 stroke-1" />
            <VisuallyHidden>Reset RPC Endpoint</VisuallyHidden>
          </button>
        ) : null}
      </div>
    </form>
  );
}

export function BoundNumericInput({
  label,
  value,
  notice,
  onValueChange,
  onBlur,
  min,
  max,
  loading,
  className,
  showRandom = false,
}: {
  label: React.ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  onBlur?: (value: string) => void;
  notice?: React.ReactNode;
  min?: number;
  max?: number;
  loading?: boolean;
  className?: string;
  showRandom?: boolean;
}) {
  const id = useId();

  const isDecrementDisabled =
    min === undefined || isNaN(Number(value)) || Number(value) <= min;
  const isIncrementDisabled =
    max === undefined || isNaN(Number(value)) || Number(value) >= max;

  return (
    <div className={className}>
      <label className="flex mb-2" htmlFor={id}>
        <span>
          <span>{label}</span>{" "}
          <span className="text-xs text-muted-foreground">
            (min: {min}, max: {max})
          </span>
        </span>
        {notice}
      </label>
      <div
        className={cn(
          "flex items-center gap-4 opacity-100 transition-opacity duration-300",
          {
            "opacity-80": loading,
          }
        )}
      >
        <button
          className="flex text-left opacity-50"
          onClick={() => onValueChange((Number(value) - 1).toString())}
          disabled={isDecrementDisabled}
        >
          <ChevronLeftIcon
            className={cn("w-4 h-4 stroke-1", {
              "opacity-20": isDecrementDisabled,
            })}
          />
        </button>
        <Input
          id={id}
          className="flex-1 text-center"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onBlur={(e) => onBlur?.(e.target.value)}
          min={min}
          max={max}
        />
        <div className="flex gap-2">
          <button
            className="flex text-right opacity-50"
            onClick={() => onValueChange((Number(value) + 1).toString())}
            disabled={isIncrementDisabled}
          >
            <ChevronRightIcon
              className={cn("w-4 h-4 stroke-1", {
                "opacity-20": isIncrementDisabled,
              })}
            />
          </button>
          {showRandom && (
            <button
              className="flex text-right opacity-50"
              onClick={() => {
                if (min === undefined || max === undefined) return;
                const randomValue = Math.floor(Math.random() * (max - min + 1)) + min;
                onValueChange(randomValue.toString());
              }}
              disabled={min === undefined || max === undefined}
            >
              <ShuffleIcon
                className={cn("w-4 h-4 stroke-1", {
                  "opacity-20": min === undefined || max === undefined,
                })}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
