import { cn } from "@/lib/utils";
import { translate } from "@/i18n";
import { FileUpIcon } from "lucide-react";
import type { NativeModelDropState } from "../use-native-drop";

function overlayCopy(state: NativeModelDropState): { title: string; description: string } {
  if (state.status === "invalid") {
    return {
      title: translate("uxNativeintents.canTUseThese1x76g"),
      description:
        state.reason ?? "Drop a .gguf model, or documents to chat with.",
    };
  }
  if (state.status === "valid" && state.action === "replace") {
    return {
      title: translate("uxNativeintents.dropToReplaceModels821k"),
      description: translate("uxNativeintents.currentModelWillUnloadx4ch2"),
    };
  }
  if (state.status === "valid" && state.action === "load") {
    return {
      title: translate("uxNativeintents.dropToLoadModel1n8lw"),
      description: translate("uxNativeintents.addsItAsThe11gka"),
    };
  }
  return {
    title: translate("uxNativeintents.dropToAddModelpqta0"),
    description: translate("uxNativeintents.reviewItBeforeLoading1okc2"),
  };
}

export function NativeModelDropOverlay({ state }: { state: NativeModelDropState }) {
  if (state.status === "attach") return null;
  const isIdle = state.status === "idle";
  const isAutoLoad =
    state.status === "valid" && state.action !== "chip";
  const isInvalid = state.status === "invalid";
  const { title, description } = overlayCopy(state);

  return (
    <div
      className={cn(
        // Clear the chat header, which owns the top of this container.
        "pointer-events-none absolute left-1/2 top-[calc(var(--studio-content-top-inset,0px)+var(--studio-chat-header-height,48px)+0.5rem)] z-50 w-[clamp(16rem,28vw,22rem)] max-w-[calc(100vw-1rem)] -translate-x-1/2 transition-all duration-200 ease-out",
        isIdle ? "-translate-y-1 opacity-0" : "translate-y-0 opacity-100",
      )}
      role="status"
      aria-live="polite"
      aria-hidden={isIdle}
    >
      <div className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-card/96 px-3 py-2.5 shadow-sm shadow-black/10 backdrop-blur-sm dark:shadow-black/30">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors duration-200 ease-out",
            isAutoLoad
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : isInvalid
                ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                : "border-border bg-muted text-muted-foreground",
          )}
        >
          <FileUpIcon className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-foreground">
            {title}
          </div>
          <div className="mt-0.5 truncate text-ui-11 leading-4 text-muted-foreground">
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}
