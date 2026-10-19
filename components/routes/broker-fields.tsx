"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Broker, BrokerCommissionType } from "@/lib/database.types";

/**
 * Broker + commission picker shared by the route and leg forms. This is how a
 * broker gets attached to a leg — without it the brokers page has nothing to
 * show. "none" means no broker; the server maps it back to NULL.
 */
export function BrokerFields({
  brokers,
  idPrefix,
  defaultBrokerId,
  defaultType,
  defaultValue,
}: {
  brokers: Broker[];
  idPrefix: string;
  defaultBrokerId?: string | null;
  defaultType?: BrokerCommissionType | null;
  defaultValue?: number | null;
}) {
  const [brokerId, setBrokerId] = useState(defaultBrokerId ?? "none");
  const [type, setType] = useState<BrokerCommissionType>(
    defaultType ?? "fixed",
  );
  const hasBroker = brokerId !== "none";

  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-3">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-broker`}>Broker</Label>
        <Select
          name="broker_id"
          value={brokerId}
          onValueChange={setBrokerId}
        >
          <SelectTrigger id={`${idPrefix}-broker`}>
            <SelectValue placeholder="No broker" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No broker</SelectItem>
            {brokers.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
                {b.city ? ` · ${b.city}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {brokers.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No brokers yet — add one under Brokers first.
          </p>
        )}
      </div>

      {hasBroker && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-comm-type`}>Commission type</Label>
            <Select
              name="broker_commission_type"
              value={type}
              onValueChange={(v) => setType(v as BrokerCommissionType)}
            >
              <SelectTrigger id={`${idPrefix}-comm-type`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed amount</SelectItem>
                <SelectItem value="percent">% of rent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-comm-value`}>
              {type === "percent" ? "Commission %" : "Commission (PKR)"}
            </Label>
            <Input
              id={`${idPrefix}-comm-value`}
              name="broker_commission_value"
              type="number"
              min="0"
              step={type === "percent" ? "0.1" : "1"}
              inputMode="decimal"
              placeholder="0"
              defaultValue={defaultValue ?? ""}
            />
          </div>
        </div>
      )}
    </div>
  );
}
