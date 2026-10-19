import { ErrorState } from "@/components/layout/error-state";

/**
 * Reached when a detail page calls notFound() — e.g. opening a route, party,
 * broker or khata contact that has since been deleted.
 */
export default function AppNotFound() {
  return (
    <ErrorState
      title="Not found"
      description="This record doesn't exist, or it was deleted. It may have been removed from another device."
    />
  );
}
