"use client";

import { useState } from "react";
import { Download, ExternalLink, Paperclip, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Receipt preview.
 *
 * Previously the paperclip opened the raw signed URL in a new tab, which loses
 * the ledger context and — on mobile — often hands the file to a download
 * manager instead of showing it. This keeps the receipt in the app next to the
 * row it belongs to, which is how people actually check "did I record this
 * slip correctly?".
 *
 * PDFs render in an <iframe> rather than <img>; the signed URL's extension is
 * the only signal we have about which it is.
 */
function isPdf(url: string): boolean {
  return /\.pdf(\?|$)/i.test(url);
}

const ZOOM_STEPS = [1, 1.5, 2, 3];

export function ReceiptViewer({
  url,
  label,
  className,
}: {
  url: string;
  /** Names the receipt in the dialog title, e.g. the expense category. */
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);

  const pdf = isPdf(url);
  const zoom = ZOOM_STEPS[zoomIndex] ?? 1;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setZoomIndex(0);
          setOpen(true);
        }}
        className={cn("shrink-0 text-muted-foreground transition-colors hover:text-foreground", className)}
        aria-label={label ? `View receipt for ${label}` : "View receipt"}
        title="View receipt">
        <Paperclip className="size-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Receipt{label ? ` — ${label}` : ""}</DialogTitle>
            <DialogDescription>{pdf ? "PDF receipt." : "Pinch or use the zoom buttons to read the slip."}</DialogDescription>
          </DialogHeader>

          <div className="max-h-[65vh] overflow-auto rounded-md border bg-muted/30">
            {pdf ? (
              <iframe src={url} title="Receipt PDF" className="h-[65vh] w-full" />
            ) : (
              <div className="flex min-h-[40vh] items-center justify-center p-2">
                <img src={url} alt={label ? `Receipt for ${label}` : "Receipt for this expense"} style={{ transform: `scale(${zoom})` }} className="max-w-full origin-center transition-transform duration-150" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {!pdf ? (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" aria-label="Zoom out" disabled={zoomIndex === 0} onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}>
                  <ZoomOut className="size-4" />
                </Button>
                <span className="w-12 text-center text-sm tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
                <Button variant="outline" size="icon" aria-label="Zoom in" disabled={zoomIndex === ZOOM_STEPS.length - 1} onClick={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}>
                  <ZoomIn className="size-4" />
                </Button>
              </div>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink aria-hidden />
                  Open
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={url} download>
                  <Download aria-hidden />
                  Download
                </a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
