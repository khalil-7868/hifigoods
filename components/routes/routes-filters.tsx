"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import type { Vehicle } from "@/lib/database.types";

/**
 * Vehicle + date-range filters for the routes list. Every control writes to the
 * URL, so a filtered view is shareable and survives a refresh. Changing any
 * filter resets `?page` — staying on page 7 of a now-3-page result is the
 * classic way to show someone an empty screen.
 */
export function RoutesFilters({
  vehicles,
  vehicleId,
  from,
  to,
}: {
  vehicles: Vehicle[];
  vehicleId: string;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hasFilters = Boolean(
    searchParams.get("q") ||
      (vehicleId && vehicleId !== "all") ||
      from ||
      to,
  );

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    params.delete("page");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 lg:col-span-2">
          <Label htmlFor="routes-search">Search</Label>
          <SearchInput placeholder="Origin, destination or material" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="routes-vehicle">Vehicle</Label>
          <Select
            value={vehicleId || "all"}
            onValueChange={(v) => setParam("vehicle", v)}
          >
            <SelectTrigger id="routes-vehicle">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All vehicles</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.plate_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="routes-from">From</Label>
            <Input
              id="routes-from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setParam("from", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="routes-to">To</Label>
            <Input
              id="routes-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setParam("to", e.target.value)}
            />
          </div>
        </div>
      </div>

      {hasFilters && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.replace(pathname, { scroll: false })}
          >
            <X aria-hidden />
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
