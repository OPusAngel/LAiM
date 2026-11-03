// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";

import {
  imageFieldCandidates,
  unmappedImageFields,
  withImageField,
} from "./api/mcp-image";
import {
  type McpImageInputMapping,
  listMcpServerTools,
  refreshMcpServerTools,
} from "./api/mcp-servers-api";

type Option = { tool: string; field: string };

export function McpImageMappings({
  serverId,
  value,
  onChange,
  disabled,
  connectionUnsaved,
}: {
  serverId?: string;
  value: McpImageInputMapping[];
  onChange: (value: McpImageInputMapping[]) => void;
  disabled: boolean;
  connectionUnsaved: boolean;
}) {
  const [enabled, setEnabled] = useState(value.length > 0);
  const [options, setOptions] = useState<Option[] | null>(null);
  const [loading, setLoading] = useState(false);
  const addable = options ? unmappedImageFields(options, value) : [];

  async function discover(id: string) {
    setLoading(true);
    try {
      const probe = await refreshMcpServerTools(id);
      if (!probe.ok) {
        throw new Error(probe.error ?? translate("uxChat.theServerDidNotyr2o7"));
      }
      const tools = await listMcpServerTools(id);
      setOptions(
        tools.flatMap((tool) =>
          imageFieldCandidates(tool.inputSchema).map((field) => ({
            tool: tool.name,
            field,
          })),
        ),
      );
    } catch (err) {
      toast.error(translate("uxChat.couldNotListThis1kphy"), {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-[14px] bg-muted/50 p-3">
      <label
        htmlFor="mcp-image-attachments"
        className="flex cursor-pointer items-start justify-between gap-3"
      >
        <span className="space-y-0.5">
          <span className="block text-sm font-medium">
            {translate("uxChat.sendAttachedImagesTo1j1jl")}
          </span>
          <span className="block max-w-[70ch] text-xs text-muted-foreground">
            {translate("uxCopy.imagesYouAttachGoy9k70")}
          </span>
        </span>
        <Switch
          id="mcp-image-attachments"
          checked={enabled}
          disabled={disabled}
          onCheckedChange={(next) => {
            setEnabled(next);
            if (!next) onChange([]);
          }}
        />
      </label>
      {enabled && !serverId ? (
        <p className="text-xs text-muted-foreground">
          {translate("uxChat.saveThisServerFirst9u4l8")}
        </p>
      ) : null}
      {enabled && serverId ? (
        <div className="space-y-2">
          {value.map((mapping) => (
            <div
              key={`${mapping.tool}:${mapping.field}`}
              className="flex items-center justify-between gap-3 text-xs"
            >
              {/* Wraps instead of truncating: a nowrap name widens the whole dialog grid to its length. */}
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                {mapping.tool} / {mapping.field}
              </span>
              <Select
                value={mapping.encoding}
                disabled={disabled}
                onValueChange={(next) =>
                  onChange(
                    withImageField(
                      value,
                      mapping,
                      next as McpImageInputMapping["encoding"],
                    ),
                  )
                }
              >
                <SelectTrigger
                  className="h-7 w-32"
                  aria-label={translate("uxChat.imageEncodingForw58ps", { p1: mapping.tool })}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="base64">{translate("uxChat.rawBase64zz2kw")}</SelectItem>
                  <SelectItem value="data_url">{translate("uxChat.dataURLhmk1h")}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                disabled={disabled}
                onClick={() =>
                  onChange(value.filter((m) => m.tool !== mapping.tool))
                }
              >
                Remove
              </Button>
            </div>
          ))}
          {connectionUnsaved ? (
            <p className="text-xs text-muted-foreground">
              {translate("uxChat.saveTheConnectionChangesxkw8r")}
            </p>
          ) : options === null ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || loading}
              onClick={() => void discover(serverId)}
            >
              {loading ? <Spinner /> : null}
              Choose image field
            </Button>
          ) : options.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {translate("uxChat.noToolOnThisi39rl")}
            </p>
          ) : addable.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <Select
                value=""
                disabled={disabled}
                onValueChange={(index) => {
                  const option = addable[Number(index)];
                  if (option) onChange(withImageField(value, option));
                }}
              >
                <SelectTrigger
                  className="min-w-56 flex-1"
                  aria-label={translate("uxRecipestudio.imageFieldbcxbk")}
                >
                  <SelectValue placeholder={translate("uxChat.addToolField55bzm")} />
                </SelectTrigger>
                <SelectContent>
                  {addable.map((option, index) => (
                    <SelectItem
                      key={`${option.tool}:${option.field}`}
                      value={String(index)}
                      className="[overflow-wrap:anywhere]"
                    >
                      {option.tool} / {option.field}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
